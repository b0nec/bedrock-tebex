## **Features**
- **Automated Command Execution**: Automatically executes commands for players when they make a payment, whether they are online or offline.
- **Offline Player Support**: Stores commands for offline players and processes them as soon as they join the server.
- **Tebex API Integration**: Connects to the Tebex API to fetch payment data and manage the command queue.
- **Error Handling**: Robust error handling to ensure smooth operation and logging for debugging.
- **Dynamic Property Storage**: Uses Minecraft's dynamic properties to store pending commands for offline players.
- **Customizable Intervals**: Adjust the interval for checking the Tebex command queue to suit your server's needs.

## **How It Works**
1. **Player Makes a Payment**: When a player makes a payment through Tebex, the Tebex API adds the payment to the command queue.
2. **Command Queue Check**: The script periodically checks the Tebex command queue for pending commands.
3. **Command Execution**:
   - If the player is online, the script executes the commands immediately.
   - If the player is offline, the script stores the commands in a dynamic property and processes them when the player rejoins.
4. **Command Cleanup**: After executing commands, the script deletes them from the Tebex queue to prevent duplication.


## **Code Overview**
Here’s a quick breakdown of the script’s structure:
- **TebexIntegration Class**: Handles all the logic for interacting with the Tebex API, executing commands, and managing player data.
- **#makeTebexRequest**: Sends HTTP requests to the Tebex API.
- **#getTebexPlayerId**: Fetches the Tebex ID for a given username.
- **#executeCommands**: Executes commands for a player.
- **#deleteCommands**: Deletes processed commands from the Tebex queue.
- **#processCommands**: Processes commands for online and offline players.
- **#checkCommandQueue**: Periodically checks the Tebex command queue for pending commands.
- **initialize**: Sets up event listeners for player join and spawn events.
