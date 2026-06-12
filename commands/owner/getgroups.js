/**
 * Get All Groups Command
 */

module.exports = {
  name: 'getgroups',
  aliases: ['groups', 'listgroups'],
  category: 'owner',
  description: 'Orodha ya groups zote bot ipo',
  usage: '.getgroups',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      await extra.reply('⏳ Inapata orodha ya groups...');

      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);

      if (groups.length === 0) {
        return extra.reply('📭 Bot haipo kwenye group yoyote!');
      }

      let text = `📋 *Groups Zote (${groups.length})*\n\n`;

      groups.forEach((group, i) => {
        text += `${i + 1}. *${group.subject}*\n`;
        text += `   👥 Members: ${group.participants.length}\n`;
        text += `   🆔 ID: ${group.id}\n\n`;
      });

      await extra.reply(text);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
