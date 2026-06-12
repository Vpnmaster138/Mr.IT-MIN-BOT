/**
 * Set Bio Command
 */

module.exports = {
  name: 'setbio',
  aliases: ['bio', 'setstatus'],
  category: 'owner',
  description: 'Badilisha bio ya bot',
  usage: '.setbio <text>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        return extra.reply('❌ Weka bio: .setbio <text>\n\nMfano: .setbio MR. MEDIATOR Bot 🤖');
      }

      const bio = args.join(' ');
      await sock.updateProfileStatus(bio);
      await extra.reply(`✅ Bio imebadilishwa!\n\n_${bio}_`);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
