/**
 * Clear Chat Command - Futa messages nyingi
 */

module.exports = {
  name: 'clearchat',
  aliases: ['cc', 'clearall'],
  category: 'owner',
  description: 'Futa messages kwenye chat',
  usage: '.clearchat <number>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const count = parseInt(args[0]) || 10;

      if (count > 100) {
        return extra.reply('❌ Kiwango cha juu ni 100 messages!');
      }

      await extra.reply(`🗑️ Inafuta messages ${count}...`);

      const messages = await sock.loadMessages(extra.from, count);

      let deleted = 0;
      for (const m of messages.messages) {
        try {
          await sock.sendMessage(extra.from, { delete: m.key });
          deleted++;
        } catch (e) {}
      }

      await extra.reply(`✅ Messages ${deleted} zimefutwa!`);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
