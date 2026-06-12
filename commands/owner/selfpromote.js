/**
 * Self Promote - Bot kujipa admin kwenye group
 */

module.exports = {
  name: 'selfpromote',
  aliases: ['getadmin', 'botadmin'],
  category: 'owner',
  description: 'Bot kujipa admin kwenye group',
  usage: '.selfpromote',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!extra.isGroup) {
        return extra.reply('❌ Command hii inatumika kwenye group tu!');
      }

      const groupMetadata = await sock.groupMetadata(extra.from);
      const botId = sock.user.id.replace(':0', '') + '@s.whatsapp.net';
      const botInGroup = groupMetadata.participants.find(p =>
        p.id === botId || p.id.includes(sock.user.id.split(':')[0])
      );

      if (!botInGroup) {
        return extra.reply('❌ Bot haipo kwenye group hii!');
      }

      if (botInGroup.admin === 'admin' || botInGroup.admin === 'superadmin') {
        return extra.reply('✅ Bot tayari ni admin kwenye group hii!');
      }

      await sock.groupParticipantsUpdate(extra.from, [botId], 'promote');
      await extra.reply('✅ Bot amepata admin rights!\n\n👑 *MR. MEDIATOR* ni admin sasa!');

    } catch (err) {
      if (err.message.includes('not-authorized')) {
        extra.reply('❌ Huwezi kufanya hivyo! Lazima wewe uwe superadmin (group creator).');
      } else {
        extra.reply(`❌ Error: ${err.message}`);
      }
    }
  }
};
