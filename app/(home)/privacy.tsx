import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      title: '1. Thông tin chúng tôi thu thập',
      content: 'Chúng tôi thu thập các thông tin sau:\n\n• Thông tin tài khoản: email, tên người dùng\n• Lịch sử xem phim và sở thích\n• Thông tin thiết bị: loại thiết bị, hệ điều hành, phiên bản ứng dụng\n• Dữ liệu sử dụng: thời gian xem, tương tác với ứng dụng',
    },
    {
      title: '2. Cách chúng tôi sử dụng thông tin',
      content: 'Thông tin của bạn được sử dụng để:\n\n• Cung cấp và cải thiện dịch vụ\n• Cá nhân hóa trải nghiệm người dùng\n• Đề xuất nội dung phù hợp\n• Gửi thông báo về phim mới và cập nhật\n• Phân tích và cải thiện hiệu suất ứng dụng\n• Bảo vệ an ninh và ngăn chặn gian lận',
    },
    {
      title: '3. Chia sẻ thông tin',
      content: 'Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn. Thông tin có thể được chia sẻ với:\n\n• Nhà cung cấp dịch vụ đáng tin cậy hỗ trợ vận hành ứng dụng\n• Cơ quan pháp luật khi có yêu cầu hợp pháp\n• Các bên liên quan trong trường hợp sáp nhập hoặc mua lại công ty',
    },
    {
      title: '4. Bảo mật thông tin',
      content: 'Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ thông tin của bạn khỏi truy cập trái phép, mất mát, hoặc tiết lộ. Tuy nhiên, không có phương thức truyền tải qua Internet nào là hoàn toàn an toàn 100%.',
    },
    {
      title: '5. Cookies và công nghệ theo dõi',
      content: 'Chúng tôi sử dụng cookies và các công nghệ tương tự để:\n\n• Ghi nhớ tùy chọn của bạn\n• Phân tích lưu lượng truy cập\n• Cải thiện trải nghiệm người dùng\n• Cung cấp nội dung được cá nhân hóa\n\nBạn có thể quản lý cookies thông qua cài đặt trình duyệt của mình.',
    },
    {
      title: '6. Quyền của bạn',
      content: 'Bạn có quyền:\n\n• Truy cập và xem thông tin cá nhân của mình\n• Yêu cầu chỉnh sửa hoặc xóa thông tin\n• Từ chối nhận thông báo marketing\n• Rút lại sự đồng ý xử lý dữ liệu\n• Khiếu nại với cơ quan quản lý dữ liệu\n\nĐể thực hiện các quyền này, vui lòng liên hệ với chúng tôi.',
    },
    {
      title: '7. Lưu trữ dữ liệu',
      content: 'Chúng tôi lưu trữ thông tin của bạn trong thời gian cần thiết để cung cấp dịch vụ và tuân thủ nghĩa vụ pháp lý. Khi bạn xóa tài khoản, chúng tôi sẽ xóa hoặc ẩn danh hóa thông tin cá nhân của bạn, trừ khi pháp luật yêu cầu lưu trữ.',
    },
    {
      title: '8. Quyền riêng tư của trẻ em',
      content: 'Ứng dụng của chúng tôi không dành cho người dưới 18 tuổi. Chúng tôi không cố ý thu thập thông tin cá nhân từ trẻ em. Nếu bạn là phụ huynh và phát hiện con bạn đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ để chúng tôi xóa thông tin đó.',
    },
    {
      title: '9. Thay đổi chính sách',
      content: 'Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng nào bằng cách đăng chính sách mới trên ứng dụng. Bạn nên xem lại chính sách này định kỳ.',
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
          <Text style={styles.headerTitle}>Chính sách bảo mật</Text>
          <View style={{ width: 24 }} />
        </View>
      </BlurView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Ionicons name="shield-checkmark" size={32} color="#FF6B6B" />
          <Text style={styles.introTitle}>Chính sách bảo mật</Text>
          <Text style={styles.introText}>
            AvTube cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.
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
          <Ionicons name="mail" size={24} color="#FF6B6B" style={{ marginBottom: 12 }} />
          <Text style={styles.contactTitle}>Liên hệ về quyền riêng tư</Text>
          <Text style={styles.contactText}>
            Nếu bạn có câu hỏi hoặc thắc mắc về Chính sách bảo mật này, vui lòng liên hệ:
          </Text>
          <Text style={styles.contactEmail}>privacy@avtube.com</Text>
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
  },
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
