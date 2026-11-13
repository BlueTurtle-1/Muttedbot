import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/queue.js';

export const data = new SlashCommandBuilder().setName('queue').setDescription('Show the queue');

export async function execute(interaction) {
  const q = getQueue(interaction.guild.id);
  if (!q.current && q.tracks.length === 0) {
    return interaction.reply('📭 Queue is empty.');
  }

  let msg = '';
  if (q.current) msg += `**Now Playing:** ${q.current.title}\n\n`;
  if (q.tracks.length > 0) {
    msg += q.tracks.map((t, i) => `${i + 1}. ${t.title} (${t.requestedBy})`).join('\n');
  } else {
    msg += '_No more tracks queued._';
  }

  return interaction.reply(msg);
}