import { SlashCommandBuilder } from 'discord.js';
import { resumeTrack } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('resume').setDescription('Resume playback');

export async function execute(interaction) {
  const ok = resumeTrack(interaction.guild.id);
  return interaction.reply(ok ? '▶️ Resumed.' : '❌ Nothing to resume.');
}