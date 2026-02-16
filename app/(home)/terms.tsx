import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      title: '1. Chấp nhận điều khoản',
      content: 'Bằng việc truy cập và sử dụng ứng dụng AvTube, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng ứng dụng.',
    },
    {
      title: '2. Sử dụng dịch vụ',
      content: 'Ứng dụng AvTube cung cấp dịch vụ xem phim trực tuyến. Bạn cam kết sử dụng dịch vụ một cách hợp pháp và không vi phạm bất kỳ quy định pháp luật nào. Nghiêm cấm việc sao chép, phân phối hoặc sử dụng nội dung cho mục đích thương mại mà không có sự cho phép.',
    },
    {
      title: '3. Tài khoản người dùng',
      content: 'Bạn có trách nhiệm bảo mật thông tin tài khoản của mình. Mọi hoạt động diễn ra dưới tài khoản của bạn đều là trách nhiệm của bạn. Vui lòng thông báo ngay cho chúng tôi nếu phát hiện bất kỳ hành vi truy cập trái phép nào.',
    },
    {
      title: '4. Nội dung và bản quyền',
      content: 'Tất cả nội dung trên ứng dụng AvTube đều thuộc quyền sở hữu của chúng tôi hoặc các đối tác cấp phép. Bạn không được phép sao chép, phân phối, hoặc tạo ra các sản phẩm phái sinh từ nội dung mà không có sự cho phép bằng văn bản.',
    },
    {
      title: '5. Giới hạn trách nhiệm',
      content: 'AvTube không chịu trách nhiệm về bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên, đặc biệt hoặc hậu quả nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ. Chúng tôi không đảm bảo rằng dịch vụ sẽ luôn khả dụng, không bị gián đoạn hoặc không có lỗi.',
    },
    {
      title: '6. Thay đổi điều khoản',
      content: 'Chúng tôi có quyền thay đổi các điều khoản này bất cứ lúc nào. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên ứng dụng. Việc bạn tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.',
    },
    {
      title: '7. Chấm dứt dịch vụ',
      content: 'Chúng tôi có quyền tạm ngưng hoặc chấm dứt quyền truy cập của bạn vào dịch vụ bất cứ lúc nào, với hoặc không có thông báo trước, nếu bạn vi phạm các điều khoản này hoặc có hành vi không phù hợp.',
    },
    {
      title: '8. Luật áp dụng',
      content: 'Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại tòa án có thẩm quyền tại Việt Nam.',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <BlurView intensity={90} tint="dark" style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Điều khoản sử dụng</Text>
          <View style={{ width: 24 }} />
        </View>
      </BlurView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Ionicons name="document-text" size={32} color="#FF6B6B" />
          <Text style={styles.introTitle}>Điều khoản sử dụng</Text>
          <Text style={styles.introText}>
            Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng ứng dụng AvTube
          </Text>
          <Text style={styles.updateDate}>Cập nhật lần cuối: 16/02/2026</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Liên hệ</Text>
          <Text style={styles.contactText}>
            Nếu bạn có bất kỳ câu hỏi nào về Điều khoản sử dụng, vui lòng liên hệ với chúng tôi qua email: support@avtube.com
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  introCard: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  updateDate: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 24,
    textAlign: 'justify',
  },
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 22,
  },
});
