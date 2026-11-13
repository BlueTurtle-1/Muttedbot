import { SlashCommandBuilder } from 'discord.js';
import { skipTrack } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('skip').setDescription('Skip current track');

export async function execute(interaction) {
  const ok = skipTrack(interaction.guild.id);
  return interaction.reply(ok ? '⏭️ Skipped.' : '❌ Nothing is playing.');
}