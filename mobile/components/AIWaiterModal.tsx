import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../theme';
import { ChatItem, ChatMessage } from './ChatItem';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { MenuItem } from './MenuCard';
import { DiningPreferencesModal } from './DiningPreferencesModal';

interface AIWaiterModalProps {
  visible: boolean;
  autoStartListen?: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onItemAddedByAI?: (item: MenuItem) => void;
}

export const AIWaiterModal: React.FC<AIWaiterModalProps> = ({
  visible,
  autoStartListen = false,
  onClose,
  menuItems,
  onItemAddedByAI,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your AI waiter for today. 🤵 How can I help you? I can take your order, remove items, answer menu questions, or clear your cart. Just say something like: 'I want to order a Wagyu Burger and two Truffle Fries!'",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'add' | 'remove' | 'clear' } | null>(null);
  const [preferencesVisible, setPreferencesVisible] = useState(false);

  // Speech & Voice States
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
  const [barHeights, setBarHeights] = useState<number[]>([10, 18, 12, 24, 16, 22, 14, 20]);
  
  const flatListRef = useRef<FlatList>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const preferences = useUserStore((state) => state.preferences);

  const showToast = (text: string, type: 'add' | 'remove' | 'clear') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Speech Recognition hook cleanup (handled on-demand in startListening)

  // Handle automatic trigger of listening mode from "Talk to Waiter" shortcut
  useEffect(() => {
    if (visible && autoStartListen) {
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, autoStartListen]);

  // Read welcome message vocally when the modal is opened
  useEffect(() => {
    if (visible && !autoStartListen) {
      const timer = setTimeout(() => {
        speakText(messages[0].text);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Dynamic animated jumping waveform height generator for speaking mode
  useEffect(() => {
    let interval: any;
    if (isCurrentlySpeaking) {
      interval = setInterval(() => {
        setBarHeights(prev => prev.map(() => Math.floor(Math.random() * 22) + 6));
      }, 100);
    } else {
      setBarHeights([6, 6, 6, 6, 6, 6, 6, 6]);
    }
    return () => clearInterval(interval);
  }, [isCurrentlySpeaking]);

  // Interrupt ongoing speech and stop listening when modal is closed
  useEffect(() => {
    if (!visible) {
      if (Platform.OS === 'web' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsCurrentlySpeaking(false);
      if (isListening) {
        stopListening();
      }
    }
  }, [visible]);

  // Auto-scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, visible]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    if (Platform.OS !== 'web') {
      alert('Speech recognition is only supported in browser mode.');
      return;
    }

    setInputText(''); // Clear input for the new speech command

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsCurrentlySpeaking(false);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    try {
      // Create a fresh, single-use instance to prevent stuck-state reuse bugs
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Speech recognition start error:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Speech recognition stop error:', err);
      }
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Text-To-Speech Synthesis Engine
  const speakText = (text: string) => {
    if (Platform.OS !== 'web' || !window.speechSynthesis || !isSpeechEnabled) return;

    window.speechSynthesis.cancel();

    // Clean text by stripping emojis and brackets like "[ADD]" or "➕" for clean natural voice pronunciation
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '')
      .replace(/\[[A-Z]+\]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Fetch and assign standard Google / narrator voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Google UK English') ||
      v.name.includes('Natural') ||
      v.lang === 'en-US' ||
      v.lang === 'en-GB'
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsCurrentlySpeaking(true);
    };

    utterance.onend = () => {
      setIsCurrentlySpeaking(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsCurrentlySpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessageText = inputText;
    const userMsgId = Date.now().toString();
    
    // Interrupt voice playback or speech recording on send
    if (Platform.OS === 'web' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsCurrentlySpeaking(false);
    }
    if (isListening) {
      stopListening();
    }

    // 1. Add user message locally
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: userMessageText } as ChatMessage,
    ];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      // 2. Fetch from consolidated backend API
      const backendUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
      
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessageText,
          history: messages.slice(-5).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('AI Server unavailable');
      }

      const data = await response.json();
      
      // 3. Process structured action returned by Gemini Waiter
      if (data.action === 'ADD' && data.items && Array.isArray(data.items)) {
        const addedNames: string[] = [];
        for (const item of data.items) {
          const matchedItem = menuItems.find(
            (m) => m.id === item.menuItemId || m.name.toLowerCase() === item.menuItemId.toLowerCase()
          );
          if (matchedItem) {
            addItem({
              id: matchedItem.id,
              name: matchedItem.name,
              price: matchedItem.price,
              icon: matchedItem.icon,
              quantity: item.quantity,
            });
            addedNames.push(`${item.quantity}x ${matchedItem.name}`);
            if (onItemAddedByAI) {
              onItemAddedByAI(matchedItem);
            }
          }
        }
        if (addedNames.length > 0) {
          showToast(`➕ Added: ${addedNames.join(', ')}`, 'add');
        }
      } else if (data.action === 'REMOVE' && data.items && Array.isArray(data.items)) {
        const removedNames: string[] = [];
        for (const item of data.items) {
          const matchedItem = menuItems.find(
            (m) => m.id === item.menuItemId || m.name.toLowerCase() === item.menuItemId.toLowerCase()
          );
          if (matchedItem) {
            for (let q = 0; q < (item.quantity || 1); q++) {
              removeItem(matchedItem.id);
            }
            removedNames.push(`${item.quantity || 1}x ${matchedItem.name}`);
          }
        }
        if (removedNames.length > 0) {
          showToast(`➖ Removed: ${removedNames.join(', ')}`, 'remove');
        }
      } else if (data.action === 'CLEAR') {
        clearCart();
        showToast(`🧹 Cart Cleared`, 'clear');
      }

      // 4. Append AI reply and speak it aloud
      const replyText = data.message || "I've updated your order successfully.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: replyText,
        },
      ]);

      // Speak AI Waiter's reply
      speakText(replyText);

    } catch (err: any) {
      console.error('Chat error:', err);
      const errorReply = "I'm having a little trouble connecting to the kitchen right now. Please check your network connection or try speaking to me again in a moment! 🤵🔌";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: errorReply,
        },
      ]);
      speakText(errorReply);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    return <ChatItem message={item} onPlayVoice={speakText} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerEmoji}>🤵</Text>
              <View>
                <Text style={styles.headerTitle}>AI Waiter Assistant</Text>
                <Text style={styles.headerSub}>The Intelligent Bistro</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Dining Preferences Toggle */}
              <TouchableOpacity
                onPress={() => setPreferencesVisible(true)}
                style={styles.headerPrefsBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.headerPrefsBtnText}>✨ Profile</Text>
              </TouchableOpacity>

              {/* TTS Global Audio Enable Toggle */}
              <TouchableOpacity
                onPress={() => {
                  const nextVal = !isSpeechEnabled;
                  setIsSpeechEnabled(nextVal);
                  if (!nextVal && Platform.OS === 'web' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    setIsCurrentlySpeaking(false);
                  }
                }}
                style={styles.headerVoiceToggle}
                activeOpacity={0.7}
              >
                <Text style={styles.headerVoiceToggleText}>
                  {isSpeechEnabled ? '🔊 Sound On' : '🔇 Muted'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast Notification Visual Chat Diff Toast */}
          {toast && (
            <View style={[
              styles.toastContainer,
              toast.type === 'add' ? styles.toastAdd : toast.type === 'remove' ? styles.toastRemove : styles.toastClear
            ]}>
              <Text style={styles.toastText}>{toast.text}</Text>
            </View>
          )}

          {/* Dynamic Audio Speaking Waveform overlay */}
          {isCurrentlySpeaking && (
            <View style={styles.waveformOverlay}>
              <Text style={styles.waveformStatusText}>🤵 AI Waiter is speaking...</Text>
              <View style={styles.waveformContainer}>
                {barHeights.map((h, i) => (
                  <View key={i} style={[styles.waveformBar, { height: h }]} />
                ))}
              </View>
            </View>
          )}

          {/* Chat List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            style={styles.chatList}
          />

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Waiter is processing your order...</Text>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            {/* Pulse Microphone STT Trigger Button */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening ? styles.micButtonActive : {}
              ]}
              onPress={toggleListening}
              disabled={loading}
              activeOpacity={0.7}
            >
              {isListening && <View style={styles.pulseRing} />}
              <Text style={styles.micButtonText}>🎙️</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={isListening ? "Listening closely... Speak now!" : "Ask me to add/remove items..."}
              placeholderTextColor={THEME.colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!loading}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() ? styles.sendButtonDisabled : {}]}
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
          
          <DiningPreferencesModal
            visible={preferencesVisible}
            onClose={() => setPreferencesVisible(false)}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 28,
    marginRight: THEME.spacing.sm,
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerVoiceToggle: {
    marginRight: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: 'rgba(220, 165, 76, 0.08)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    borderRadius: THEME.radius.sm,
  },
  headerVoiceToggleText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  closeButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.sm,
  },
  closeButtonText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
  chatList: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    backgroundColor: 'rgba(24, 24, 28, 0.5)',
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginLeft: THEME.spacing.sm,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    alignItems: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.round,
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
    position: 'relative',
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  micButtonText: {
    fontSize: 18,
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: THEME.radius.round,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: THEME.colors.text,
    fontSize: 14,
    marginRight: THEME.spacing.sm,
  },
  sendButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: THEME.colors.border,
    opacity: 0.5,
  },
  sendButtonText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  toastContainer: {
    position: 'absolute',
    top: 75,
    left: THEME.spacing.md,
    right: THEME.spacing.md,
    zIndex: 9999,
    paddingVertical: THEME.spacing.sm + 2,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastAdd: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderColor: '#10b981',
  },
  toastRemove: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderColor: '#ef4444',
  },
  toastClear: {
    backgroundColor: 'rgba(220, 165, 76, 0.95)',
    borderColor: '#dca54c',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  waveformOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(220, 165, 76, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220, 165, 76, 0.15)',
  },
  waveformStatusText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  waveformBar: {
    width: 3,
    backgroundColor: THEME.colors.primary,
    marginHorizontal: 1.5,
    borderRadius: 1.5,
  },
  headerPrefsBtn: {
    marginRight: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: 'rgba(220, 165, 76, 0.08)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    borderRadius: THEME.radius.sm,
  },
  headerPrefsBtnText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
});
