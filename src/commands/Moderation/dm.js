import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js'; 
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/sanitization.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("dm")
        .setDescription("Send a direct message to a user (Staff only)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to send a DM to")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("The message to send")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName("anonymous")
                .setDescription("Send the message anonymously (default: false)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    category: "Moderation",

    async execute(interaction, config, client) {
        // Crucial: Pass the ephemeral flag to the defer step so the setup response is hidden from the public
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) {
            logger.warn(DM interaction defer failed, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm'
            });
            return;
        }
const targetUser = interaction.options.getUser("user");
        const message = interaction.options.getString("message");
        const anonymous = interaction.options.getBoolean("anonymous") || false;

        try {
            if (message.length > 2000) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("Message Too Long", "Messages must be under 2000 characters.")],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (targetUser.bot) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("Cannot DM Bot", "You cannot send DMs to bot accounts.")],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const sanitized = sanitizeMarkdown(message);
            const dmChannel = await targetUser.createDM();

            // Build the standard or anonymous embed layout
            const dmEmbed = successEmbed(
                anonymous ? "Message from the Staff Team" : Message from ${interaction.user.tag},
                sanitized
            );
// Anonymity Fix: Removed the interaction.id variable entirely from the user's view
            dmEmbed.setFooter({
                text: "You cannot reply to this message. | Automated Staff Notice"
            });

            await dmChannel.send({ embeds: [dmEmbed] });

            // Internal log for audits remains completely intact
            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: "DM Sent",
                    target: ${targetUser.tag} (${targetUser.id}),
                    executor: ${interaction.user.tag} (${interaction.user.id}),
                    reason: Anonymous: ${anonymous ? 'Yes' : 'No'},
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length
                    }
                }
            });

            // Final Confirmation: Keeps the channel name private via ephemeral visibility
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        "DM Sent",
                        Successfully sent a ${anonymous ? 'anonymous' : 'standard'} message to ${targetUser.tag}
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            logger.error('DM command error:', error);

            if (error.code === 50007) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("Error", Could not send a DM to ${targetUser.tag}. They may have DMs disabled.)],
                    flags: MessageFlags.Ephemeral,
                });
            }
return await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", Failed to send DM: ${error.message})],
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};
