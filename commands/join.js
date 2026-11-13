import { SlashCommandBuilder } from 'discord.js';
import { ensureConnection } from '../music/player.js';

export const data = new SlashCommandBuilder().setName('join').setDescription('Join your voice channel');

export async function execute(interaction) {
  const vc = interaction.member.voice?.channel;
  if (!vc) return interaction.reply({ content: '❌ Join a voice channel first.', ephemeral: true });
  ensureConnection(interaction.guild, vc, interaction.channel);
  return interaction.reply(`✅ Joined **${vc.name}**.`);
}