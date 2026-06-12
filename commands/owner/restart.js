/**
 * Restart Bot Command
 */

module.exports = {
  name: 'restart',
  aliases: ['reboot', 'rs'],
  category: 'owner',
  description: 'Restart bot',
  usage: '.restart',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      await extra.reply('🔄 Bot inafanya restart...\n\n⏳ Subiri sekunde 10-20');
      setTimeout(() => {
        process.exit(0); // Railway itaanza upya automatically
      }, 2000);
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
