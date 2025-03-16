import { world, system } from '@minecraft/server';
import { http, HttpHeader, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
import { tebexSecret, tebexBaseUrl, config } from './config.js';

class TebexIntegration {
    constructor() {
        this.tebexIdToUsername = new Map();
        this.checkIntervalTicks = config.checkIntervalTicks;
        this.apiTimeoutSeconds = config.apiTimeoutSeconds;
    }

    async makeTebexRequest(endpoint, method = HttpRequestMethod.Get, body = '') {
        const url = `${tebexBaseUrl}${endpoint}`;
        const request = new HttpRequest(url)
            .setMethod(method)
            .setBody(body)
            .setHeaders([
                new HttpHeader('X-Tebex-Secret', tebexSecret),
                new HttpHeader('Content-Type', 'application/json')
            ])
            .setTimeout(this.apiTimeoutSeconds);

        try {
            const response = await http.request(request);
            if (response.status === 200) return JSON.parse(response.body);
            if (response.status === 204) return null;
            throw new Error(`Tebex API error ${response.status}: ${response.body}`);
        } catch (error) {
            console.error(`Tebex API request failed for ${url}:`, error);
            throw error;
        }
    }

    async getTebexPlayerId(username) {
        try {
            const response = await this.makeTebexRequest(`/user/${encodeURIComponent(username)}`);
            return response?.id ?? null;
        } catch (error) {
            console.warn(`Failed to get Tebex ID for ${username}:`, error);
            return null;
        }
    }

    async executeCommands(player, commands) {
        for (const { command, id } of commands) {
            try {
                const formattedCommand = command.replace('{username}', player.name);
                await player.runCommandAsync(formattedCommand);
                console.log(`Command executed for ${player.name} [ID: ${id}]: ${formattedCommand}`);
            } catch (error) {
                console.error(`Command execution failed for ${player.name} [ID: ${id}]:`, error);
            }
        }
    }

    async deleteCommands(commandIds) {
        if (!commandIds?.length) return;

        try {
            await this.makeTebexRequest('/queue', HttpRequestMethod.Delete, JSON.stringify({ ids: commandIds }));
            console.log(`Deleted commands: ${commandIds.join(', ')}`);
        } catch (error) {
            console.error('Failed to delete commands:', error);
        }
    }

    async processCommands(tebexId, username, commands, isOnlineCommands) {
        const player = world.getPlayers({ name: username })[0];
        const commandIds = commands.map(cmd => cmd.id);
        const storageKey = `${tebexId}_tebex_commands_${isOnlineCommands ? 'online' : 'offline'}`;

        if (player) {
            await this.executeCommands(player, commands);
            await this.deleteCommands(commandIds);
        } else {
            world.setDynamicProperty(storageKey, JSON.stringify(commands));
            console.warn(`Stored ${isOnlineCommands ? 'online' : 'offline'} commands for offline player ${username}`);
        }
    }

    async checkCommandQueue() {
        try {
            const queueData = await this.makeTebexRequest('/queue');
            const players = queueData?.players ?? [];

            for (const { id: tebexId, name: username } of players) {
                this.tebexIdToUsername.set(tebexId, username);

                // Process offline commands
                const offlineData = queueData?.players.find(p => p.id === tebexId);
                if (offlineData?.commands?.length) {
                    await this.processCommands(tebexId, username, offlineData.commands, false);
                }

                // Process online commands
                const onlineData = await this.makeTebexRequest(`/queue/online-commands/${tebexId}`);
                if (onlineData?.commands?.length) {
                    await this.processCommands(tebexId, username, onlineData.commands, true);
                }
            }
        } catch (error) {
            console.error('Command queue processing failed:', error);
        }
    }

    initialize() {
        world.afterEvents.playerJoin.subscribe(async ({ player }) => {
            const tebexId = await this.getTebexPlayerId(player.name);
            if (tebexId) {
                this.tebexIdToUsername.set(tebexId, player.name);
            }
        });

        world.afterEvents.playerSpawn.subscribe(async ({ player, initialSpawn }) => {
            if (!initialSpawn) return;

            const tebexId = [...this.tebexIdToUsername]
                .find(([_, name]) => name === player.name)?.[0];
            if (!tebexId) return;

            for (const type of ['offline', 'online']) {
                const key = `${tebexId}_tebex_commands_${type}`;
                const commandsStr = world.getDynamicProperty(key);
                if (commandsStr) {
                    try {
                        const commands = JSON.parse(commandsStr);
                        await this.executeCommands(player, commands);
                        await this.deleteCommands(commands.map(cmd => cmd.id));
                        world.setDynamicProperty(key, undefined);
                    } catch (error) {
                        console.error(`Failed to process stored ${type} commands for ${player.name}:`, error);
                    }
                }
            }
        });

        system.runInterval(() => this.checkCommandQueue(), this.checkIntervalTicks);
    }
}

// Initialize the Tebex integration
const tebex = new TebexIntegration();
tebex.initialize();