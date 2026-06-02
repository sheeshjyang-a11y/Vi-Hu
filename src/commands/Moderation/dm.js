```js
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import {
    errorEmbed,
    successEmbed
} from '../../utils/embeds.js';

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
                .setDescription("Send the message anonymously")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    category: "Moderation",

    async execute(interaction, config, client) {

        const deferSuccess = await InteractionHelper.safeDefer(interaction);

        if (!deferSuccess) {
            logger.warn(`DM interaction defer failed`, {
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

            // Message length check
            if (message.length > 2000) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Message Too Long",
                            "Messages must be under 2000 characters."
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Prevent bot DMs
            if (targetUser.bot) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Cannot DM Bot",
                            "You cannot send DMs to bot accounts."
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Sanitize message
            const sanitized = sanitizeMarkdown(message);

            // Create DM
            const dmChannel = await targetUser.createDM();

            // Send DM anonymously
            await dmChannel.send({
                embeds: [
                    successEmbed(
                        anonymous
                            ? "Message from the Staff Team"
                            : `Message from ${interaction.user.tag}`,
                        sanitized
                    )
                ]
            });

            // Delete interaction reply for no visible trace
            await InteractionHelper.safeEditReply(interaction, {
                content: "‎",
                embeds: [],
                components: [],
            });

            await interaction.deleteReply().catch(() => {});

            return;

        } catch (error) {

            logger.error('DM command error:', error);

            if (error.code === 50007) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        errorEmbed(
                            "Error",
                            `Could not send a DM to ${targetUser.tag}. They may have DMs disabled.`
                        ),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        "Error",
                        `Failed to send DM: ${error.message}`
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};
```
