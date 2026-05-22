import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface ChatItemProps {
  message: ChatMessage;
  onPlayVoice?: (text: string) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({ message, onPlayVoice }) => {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤵</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.aiText]}>
          {message.text}
        </Text>
        {!isUser && onPlayVoice && (
          <TouchableOpacity
            style={styles.speakerButton}
            onPress={() => onPlayVoice(message.text)}
            activeOpacity={0.6}
          >
            <Text style={styles.speakerIcon}>🔊 Listen</Text>
          </TouchableOpacity>
        )}
      </View>
      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: THEME.spacing.md,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginHorizontal: THEME.spacing.xs,
  },
  userAvatar: {
    backgroundColor: THEME.colors.primary,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: THEME.colors.chatBubbleUser,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: THEME.colors.chatBubbleAI,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.12)',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: THEME.colors.text,
  },
  aiText: {
    color: THEME.colors.text,
  },
  speakerButton: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(220, 165, 76, 0.08)',
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakerIcon: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
});
