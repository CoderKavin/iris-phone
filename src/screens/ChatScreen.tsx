import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, fontSizes, radii, spacing} from '../theme/colors';
import {apiRequest} from '../api/client';

type Msg = {
  id: string;
  role: 'user' | 'iris' | 'system';
  text: string;
  ts: number;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'iris',
      text: 'Connected to cloud brain. Ask me anything.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setColdStart(false);
    try {
      const res = await apiRequest<{response?: string; reply?: string; text?: string}>(
        '/api/chat',
        {
          method: 'POST',
          body: {query: text, message: text, source: 'phone'},
          timeoutMs: 60000,
          onColdStart: () => setColdStart(true),
        },
      );
      const reply =
        res?.response ?? res?.reply ?? res?.text ?? JSON.stringify(res);
      setMessages(prev => [
        ...prev,
        {id: `i-${Date.now()}`, role: 'iris', text: reply, ts: Date.now()},
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'system',
          text: `Error: ${e?.message ?? 'unknown'}`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setColdStart(false);
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 50);
    }
  }, [input, loading]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>IRIS</Text>
          <Text style={styles.headerSub}>cloud brain</Text>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => <MessageBubble msg={item} />}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({animated: false})
          }
        />
        {coldStart && (
          <View style={styles.coldRow}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.coldText}>Waking up IRIS…</Text>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask IRIS…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
            editable={!loading}
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            style={({pressed}) => [
              styles.sendBtn,
              (loading || !input.trim()) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}>
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({msg}: {msg: Msg}) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'system';
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.alignRight : styles.alignLeft,
      ]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? styles.bubbleUser
            : isError
            ? styles.bubbleError
            : styles.bubbleIris,
        ]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  flex: {flex: 1},
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerSub: {color: colors.textMuted, fontSize: fontSizes.xs, letterSpacing: 1.5, textTransform: 'uppercase'},
  listContent: {padding: spacing.lg, paddingBottom: spacing.xl},
  bubbleRow: {marginBottom: spacing.md, flexDirection: 'row'},
  alignRight: {justifyContent: 'flex-end'},
  alignLeft: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  bubbleUser: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
  },
  bubbleIris: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
  },
  bubbleError: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: 1,
  },
  bubbleText: {color: colors.textPrimary, fontSize: fontSizes.md, lineHeight: 22},
  coldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  coldText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginLeft: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 120,
    borderColor: colors.border,
    borderWidth: 1,
  },
  sendBtn: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {opacity: 0.4},
  sendBtnPressed: {opacity: 0.7},
  sendText: {color: colors.textPrimary, fontWeight: '700'},
});
