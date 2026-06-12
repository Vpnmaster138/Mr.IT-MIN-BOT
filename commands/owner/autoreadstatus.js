/**
 * Auto Read Status Command
 */
const config = require('../../config');

module.exports = {
  name: 'autoreadstatus',
  aliases: ['ars', 'readstatus'],
  category: 'owner',
  description: 'Auto read status za contacts zote',
  usage: '.autoreadstatus <on/off>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoReadStatus ? 'ON ✅' : 'OFF ❌';
        return extra.reply(
          `👁️ *Auto Read Status*\n\n` +
          `Current: *${status}*\n\n` +
          `Usage:\n• .autoreadstatus on\n• .autoreadstatus off`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoReadStatus = true;
        return extra.reply('✅ Auto Read Status: *ON*\nBot itasoma status zote automatically!');
      }

      if (opt === 'off') {
        config.autoReadStatus = false;
        return extra.reply('❌ Auto Read Status: *OFF*');
      }

      extra.reply('❌ Tumia: .autoreadstatus on / off');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
