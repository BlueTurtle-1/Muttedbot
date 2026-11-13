import { SlashCommandBuilder } from 'discord.js';
import { searchTrack } from '../music/search.js';
import { enqueueAndPlay } from '../music/player.js';
import { isPlayBlacklisted } from '../music/blacklist.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song by name and optionally artist')
  .addStringOption((opt) =>
    opt.setName('song').setDescription('Song name').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('artist').setDescription('Artist name').setRequired(false)
  );

export async function execute(interaction) {
  const song = interaction.options.getString('song');
  const artist = interaction.options.getString('artist');
  const query = artist ? `${song} ${artist}` : song;

  if (isPlayBlacklisted(query)) {
    return interaction.reply({ content: '❌ That search is blocked by the bot’s content filter.', ephemeral: true });
  }

  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel.', ephemeral: true });
  }

  await interaction.deferReply();

  const track = await searchTrack(query, member.user.username);
  if (!track) {
    return interaction.editReply(`❌ No results found for "${query}".`);
  }

  const added = await enqueueAndPlay(interaction.guild, voiceChannel, interaction.channel, track);
  if (!added) return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
  return interaction.editReply(`🔎 Found: **${track.title}**`);
}