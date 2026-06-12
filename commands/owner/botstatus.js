/**
 * Bot Status Command - Maelezo ya bot
 */
const config = require('../../config');
const os = require('os');

module.exports = {
  name: 'botstatus',
  aliases: ['bs', 'botinfo', 'status'],
  category: 'owner',
  description: 'Angalia hali ya bot na server',
  usage: '.botstatus',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
      const cpuLoad = os.loadavg()[0].toFixed(2);
      const platform = os.platform();
      const nodeVersion = process.version;

      const text =
        `╭━━『 *BOT STATUS* 』━━╮\n\n` +
        `🤖 *Bot:* ${config.botName}\n` +
        `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
        `💾 *RAM:* ${memUsed} MB / ${memTotal} MB\n` +
        `⚡ *CPU Load:* ${cpuLoad}%\n` +
        `🖥️ *Platform:* ${platform}\n` +
        `🟢 *Node.js:* ${nodeVersion}\n\n` +
        `⚙️ *Settings:*\n` +
        `• Auto Read: ${config.autoRead ? '✅' : '❌'}\n` +
        `• Auto Read Status: ${config.autoReadStatus ? '✅' : '❌'}\n` +
        `• Auto React: ${config.autoReact ? '✅' : '❌'}\n` +
        `• Auto Like Status: ${config.autoLikeStatus ? '✅' : '❌'}\n` +
        `• Auto Reply: ${config.autoReply ? '✅' : '❌'}\n` +
        `• Auto Typing: ${config.autoTyping ? '✅' : '❌'}\n` +
        `• Auto Recording: ${config.autoRecording ? '✅' : '❌'}\n` +
        `• Self Mode: ${config.selfMode ? '✅' : '❌'}\n\n` +
        `╰━━━━━━━━━━━━━━━━━`;

      await extra.reply(text);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
