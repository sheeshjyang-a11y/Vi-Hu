import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("catch")
    .setDescription("Catch a wanted criminal and claim their bounty!")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The wanted user you are trying to catch.")
        .setRequired(true)
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    try {
      // 1. Defer the reply to give the bot time to process
      await InteractionHelper.safeDefer(interaction);

      const targetUser = interaction.options.getUser("target");

      if (!targetUser) {
        throw new TitanBotError(
          'Target user not found for catch command',
          ErrorTypes.USER_INPUT,
          'Could not find the specified user.'
        );
      }

      // 2. Prevent users from catching themselves
      if (targetUser.id === interaction.user.id) {
        const selfEmbed = errorEmbed({
          title: "❌ Turn In Denied!",
          description: "You cannot claim your own bounty! Turn yourself in to the authorities instead."
        });
        return await InteractionHelper.safeEditReply(interaction, { embeds: [selfEmbed] });
      }

      // 3. Generate a random escape or capture rate (e.g., 60% chance of success)
      const catchChance = Math.random();
      const isCaught = catchChance > 0.40;
if (!isCaught) {
        // Failed capture scenario
        const escapeEmbed = errorEmbed({
          title: "🏃‍♂️ THE CRIMINAL ESCAPED!",
          description: You tried to ambush **${targetUser.tag}**, but they outsmarted you and slipped away into the shadows!
        });

        logger.debug(Catch command failed: ${interaction.user.id} missed ${targetUser.id});
        return await InteractionHelper.safeEditReply(interaction, { embeds: [escapeEmbed] });
      }

      // 4. Successful capture scenario (Mirrors the bounty logic from your /wanted command)
      const bountyAmount = Math.floor(Math.random() * (100000000 - 1000000) + 1000000);
      const bountyClaimed = $${bountyAmount.toLocaleString()} USD;

      const successEmbed = createEmbed({
        color: 'success', // Uses your framework's success theme
        title: '🤠 BOUNTY CLAIMED! 🤠',
        description: **Bounty Hunter:** ${interaction.user.toString()}\n**Captured Criminal:** ${targetUser.toString()},
        fields: [
          {
            name: "💰 REWARD PAID",
            value: You successfully brought them in and collected **${bountyClaimed}**!,
            inline: false,
          },
        ],
        thumbnail: {
          url: interaction.user.displayAvatarURL({ size: 256, extension: 'png' }),
        },
        footer: {
          text: Justice served in ${interaction.guild.name},
        },
      });

      // 5. Send the success response
      await InteractionHelper.safeEditReply(interaction, { embeds: [successEmbed] });
      logger.debug(Catch command successfully executed by ${interaction.user.id} on ${targetUser.id});

    } catch (error) {
      logger.error('Catch command error:', error);
      await handleInteractionError(interaction, error, {
        commandName: 'catch',
        source: 'catch_command'
      });
    }
  },
};
