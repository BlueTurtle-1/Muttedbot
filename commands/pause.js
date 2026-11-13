import { SlashCommandBuilder } from 'discord.js';
import { pauseTrack } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('pause').setDescription('Pause playback');

export async function execute(interaction) {
  const ok = pauseTrack(interaction.guild.id);
  return interaction.reply(ok ? '⏸️ Paused.' : '❌ Nothing is playing.');
}