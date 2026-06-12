/**
 * Auto Recording Command - Bot ionekane inafanya recording
 */
const config = require('../../config');

module.exports = {
  name: 'autorecording',
  aliases: ['arec', 'recording'],
  category: 'owner',
  description: 'Bot ionekane inafanya voice recording kila message',
  usage: '.autorecording <on/off>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoRecording ? 'ON ✅' : 'OFF ❌';
        return extra.reply(
          `🎙️ *Auto Recording*\n\n` +
          `Current: *${status}*\n\n` +
          `Usage:\n• .autorecording on\n• .autorecording off`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoRecording = true;
        return extra.reply('✅ Auto Recording: *ON*\nBot itaonekana inafanya recording!');
      }

      if (opt === 'off') {
        config.autoRecording = false;
        return extra.reply('❌ Auto Recording: *OFF*');
      }

      extra.reply('❌ Tumia: .autorecording on / off');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
