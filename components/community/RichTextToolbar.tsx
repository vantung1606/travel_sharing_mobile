import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';

import { WF_COLORS, WF_PAPER } from '@/constants/Colors';

export type RichFormatType =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'quote'
  | 'list'
  | 'code'
  | 'link';

/**
 * Áp dụng cú pháp định dạng Markdown vào chuỗi nội dung hiện tại
 */
export function applyFormat(
  currentText: string,
  formatType: RichFormatType,
  selection?: { start: number; end: number }
): string {
  const text = currentText || '';
  const start = selection?.start ?? text.length;
  const end = selection?.end ?? text.length;
  const selected = text.slice(start, end);

  let replacement = '';
  switch (formatType) {
    case 'bold':
      replacement = `**${selected || 'in đậm'}**`;
      break;
    case 'italic':
      replacement = `*${selected || 'in nghiêng'}*`;
      break;
    case 'heading': {
      const needsLeading = start > 0 && text[start - 1] !== '\n';
      replacement = `${needsLeading ? '\n' : ''}### ${selected || 'Tiêu đề'}\n`;
      break;
    }
    case 'quote': {
      const needsLeading = start > 0 && text[start - 1] !== '\n';
      replacement = `${needsLeading ? '\n' : ''}> ${selected || 'Trích dẫn...'}\n`;
      break;
    }
    case 'list': {
      const needsLeading = start > 0 && text[start - 1] !== '\n';
      replacement = `${needsLeading ? '\n' : ''}- ${selected || 'Mục danh sách'}\n`;
      break;
    }
    case 'code':
      replacement = `\`${selected || 'mã'}\``;
      break;
    case 'link':
      replacement = `[${selected || 'Liên kết'}](https://)`;
      break;
    default:
      return text;
  }

  return text.slice(0, start) + replacement + text.slice(end);
}

interface RichTextToolbarProps {
  value: string;
  onChangeText: (text: string) => void;
  selection?: { start: number; end: number };
}

/**
 * Thanh công cụ định dạng chữ phong phú cho màn hình Đăng/Sửa bài viết
 */
export function RichTextToolbar({
  value,
  onChangeText,
  selection,
}: RichTextToolbarProps) {
  const handlePress = (type: RichFormatType) => {
    const next = applyFormat(value, type, selection);
    onChangeText(next);
  };

  return (
    <View style={styles.toolbarContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}>
        <Text style={styles.toolbarLabel}>ĐỊNH DẠNG:</Text>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('bold')}
          activeOpacity={0.7}
          accessibilityLabel="In đậm">
          <Text style={[styles.toolIconText, { fontWeight: '900' }]}>B</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('italic')}
          activeOpacity={0.7}
          accessibilityLabel="In nghiêng">
          <Text style={[styles.toolIconText, { fontStyle: 'italic', fontWeight: 'bold' }]}>I</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('heading')}
          activeOpacity={0.7}
          accessibilityLabel="Tiêu đề đoạn">
          <Text style={[styles.toolIconText, { fontWeight: '800' }]}>H</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('quote')}
          activeOpacity={0.7}
          accessibilityLabel="Trích dẫn">
          <FontAwesome name="quote-left" size={12} color={WF_PAPER.inkPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('list')}
          activeOpacity={0.7}
          accessibilityLabel="Gạch đầu dòng">
          <FontAwesome name="list-ul" size={12} color={WF_PAPER.inkPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('code')}
          activeOpacity={0.7}
          accessibilityLabel="Đoạn mã">
          <FontAwesome name="code" size={12} color={WF_PAPER.inkPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => handlePress('link')}
          activeOpacity={0.7}
          accessibilityLabel="Chèn liên kết">
          <FontAwesome name="link" size={12} color={WF_PAPER.inkPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

interface RichPostTextProps {
  content?: string | null;
  style?: TextStyle;
  numberOfLines?: number;
}

/**
 * Hiển thị nội dung bài viết với cú pháp Markdown và @mention
 */
export function RichPostText({ content, style, numberOfLines }: RichPostTextProps) {
  if (!content) return null;

  const lines = String(content).split('\n');

  return (
    <View style={styles.richContainer}>
      {lines.map((rawLine, lineIdx) => {
        const line = rawLine.trimEnd();

        // 1. Dòng trống
        if (!line.trim()) {
          return <View key={lineIdx} style={styles.emptyLine} />;
        }

        // 2. Tiêu đề
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const headingText = line.replace(/^#+\s*/, '');
          return (
            <Text
              key={lineIdx}
              style={[styles.headingText, style]}
              numberOfLines={numberOfLines}>
              {renderInlineMarkdown(headingText)}
            </Text>
          );
        }

        // 3. Trích dẫn
        if (line.startsWith('> ') || line.startsWith('>')) {
          const quoteText = line.replace(/^>\s?/, '');
          return (
            <View key={lineIdx} style={styles.quoteBlock}>
              <Text style={[styles.quoteText, style]} numberOfLines={numberOfLines}>
                {renderInlineMarkdown(quoteText)}
              </Text>
            </View>
          );
        }

        // 4. Danh sách gạch đầu dòng
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const itemText = line.slice(2);
          return (
            <View key={lineIdx} style={styles.listRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={[styles.listText, style]} numberOfLines={numberOfLines}>
                {renderInlineMarkdown(itemText)}
              </Text>
            </View>
          );
        }

        // 5. Đoạn văn thường
        return (
          <Text key={lineIdx} style={[styles.paragraphText, style]} numberOfLines={numberOfLines}>
            {renderInlineMarkdown(line)}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Phân tích các token nội tuyến: Bold, Italic, Code, Link, Mention
 */
function renderInlineMarkdown(text: string) {
  if (!text) return null;

  const tokenRegex =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|@[\w\u00C0-\u1EF9.]+)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <Text key={index} style={styles.italicText}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={index} style={styles.codeText}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Link: [title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, title, url] = linkMatch;
      return (
        <Text
          key={index}
          style={styles.linkText}
          onPress={() => {
            if (url) {
              Linking.openURL(url).catch(() => {});
            }
          }}>
          {title}
        </Text>
      );
    }

    // Mention: @user
    if (part.startsWith('@') && part.length > 1) {
      return (
        <Text key={index} style={styles.mentionText}>
          {part}
        </Text>
      );
    }

    // Plain text
    return <Text key={index}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: WF_PAPER.bg,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: WF_PAPER.clayLight,
    borderBottomWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toolbarContent: {
    alignItems: 'center',
    gap: 6,
  },
  toolbarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_PAPER.inkMuted,
    marginRight: 4,
    letterSpacing: 0.5,
  },
  toolBtn: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: WF_PAPER.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WF_PAPER.clayLight,
  },
  toolIconText: {
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: WF_PAPER.clayLight,
    marginHorizontal: 2,
  },
  richContainer: {
    gap: 3,
  },
  emptyLine: {
    height: 6,
  },
  headingText: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: WF_PAPER.clay,
    paddingLeft: 8,
    paddingVertical: 2,
    marginVertical: 2,
    backgroundColor: 'rgba(217, 119, 87, 0.08)',
    borderRadius: 2,
  },
  quoteText: {
    fontStyle: 'italic',
    color: WF_PAPER.inkPrimary,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 1,
  },
  bulletDot: {
    fontSize: 14,
    color: WF_PAPER.clay,
    lineHeight: 18,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    lineHeight: 18,
  },
  paragraphText: {
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
    color: WF_PAPER.inkPrimary,
  },
  italicText: {
    fontStyle: 'italic',
  },
  codeText: {
    backgroundColor: 'rgba(30, 26, 21, 0.08)',
    fontFamily: 'monospace',
    fontSize: 12,
    color: WF_COLORS.rose,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  linkText: {
    color: WF_PAPER.sky,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  mentionText: {
    color: WF_PAPER.sky,
    fontWeight: '700',
  },
});
