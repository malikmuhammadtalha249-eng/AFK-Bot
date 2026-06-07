const mineflayer = require('mineflayer');

// Configuration details
const botOptions = {
  host: 'mc.blockdrop.org',
  port: 25565,
  username: 'winkz',
  version: '1.8.9'
};

let bot;

function startBot() {
  console.log('Connecting to BlockDrop...');
  bot = mineflayer.createBot(botOptions);

  // 1. Handle Login Command immediately upon entering the lobby
  bot.on('spawn', () => {
    console.log('Spawned in lobby. Sending login command...');
    
    // Slight 1-second delay to ensure the server is ready to accept chat input
    setTimeout(() => {
      bot.chat('/login codetalker');
      console.log('Login command sent. Waiting for inventory to load...');
      
      // 2. Trigger compass navigation sequence after logging in
      navigateLobby();
    }, 1000);
  });

  // Navigation Logic
  function navigateLobby() {
    // Wait 4 seconds for items to settle in the inventory slots
    setTimeout(() => {
      const compass = bot.inventory.items().find(item => item.name.toLowerCase().includes('compass'));
      
      if (compass) {
        bot.equip(compass, 'hand', () => {
          console.log('Compass equipped. Opening server selector...');
          bot.activateItem(); 
          
          // Listen for the custom selection menu to open
          bot.once('windowOpen', (window) => {
            console.log('Selector GUI opened. Searching for Factions (TNT)...');
            
            // Find the item by looking for 'tnt' in its technical name
            const factionsTNT = window.items().find(item => item.name.toLowerCase().includes('tnt'));
            
            if (factionsTNT) {
              bot.clickWindow(factionsTNT.slot, 0, 0);
              console.log('Clicked Factions TNT! Transferring...');
            } else {
              // Fallback if the GUI item fails to click
              console.log('TNT item not found in menu. Trying chat fallback...');
              bot.chat('/server factions');
            }
          });
        });
      } else {
        console.log('Compass not found in hotbar. Trying chat fallback...');
        bot.chat('/server factions');
      }
    }, 4000);
  }

  // 3. Keep-Alive: Small jump every 60 seconds inside Factions to avoid AFK kicks
  const afkInterval = setInterval(() => {
    if (bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, 60000);

  // 4. Auto-Reconnect: If the bot is kicked, dropped, or errors out, clean up and restart
  bot.on('kick', (reason) => {
    console.log(`Kicked from server. Reason: ${reason}. Reconnecting in 10 seconds...`);
    handleRestart(afkInterval);
  });

  bot.on('end', () => {
    console.log('Connection lost. Reconnecting in 10 seconds...');
    handleRestart(afkInterval);
  });

  bot.on('error', (err) => {
    console.log(`Internal network error: ${err}`);
  });
}

function handleRestart(intervalId) {
  // Clear the jump interval timer so they don't stack up infinitely
  clearInterval(intervalId);
  
  // Safely remove event listeners from the dead bot instance
  bot.removeAllListeners();
  
  // Wait 10 seconds before spinning up a brand new connection instance
  setTimeout(() => {
    startBot();
  }, 10000);
}

// Boot up the first instance of the bot loop
startBot();
