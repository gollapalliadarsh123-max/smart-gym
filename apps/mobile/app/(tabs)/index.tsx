import { StyleSheet } from 'react-native';
import { APP_DESCRIPTION, APP_NAME } from '@smart-gym/shared';
import { Text, View } from '@/components/Themed';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.description}>{APP_DESCRIPTION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.75,
  },
});
