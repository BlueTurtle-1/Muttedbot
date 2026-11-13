import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/queue.js';

export const data = new SlashCommandBuilder().setName('nowplaying').setDescription('Show current track');

export async function execute(interaction) {
  const q = getQueue(interaction.guild.id);
  if (!q.current) return interaction.reply('❌ Nothing is playing.');
  return interaction.reply(`🎶 Now playing: **${q.current.title}** (requested by ${q.current.requestedBy})`);
}