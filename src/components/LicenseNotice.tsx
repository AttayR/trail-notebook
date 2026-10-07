import { Linking, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

/** Required attribution. Gemma sentence is the exact notice from the Gemma Terms of Use. */
export function LicenseNotice() {
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Models and licenses</Text>
      <Text style={styles.body}>
        Gemma is provided under and subject to the Gemma Terms of Use found at{' '}
        <Text style={styles.link} onPress={() => Linking.openURL('https://ai.google.dev/gemma/terms')}>
          ai.google.dev/gemma/terms
        </Text>
        .
      </Text>
      <Text style={styles.body}>
        Bird sound identification uses BirdNET (Kahl, Wood, Klinck et al., K. Lisa Yang Center for Conservation
        Bioacoustics), licensed CC BY-NC-SA 4.0, for non-commercial use.
      </Text>
      <Text style={styles.body}>Models run entirely on this phone. Nothing you record or write is uploaded.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.md },
  heading: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  body: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, marginBottom: spacing.xs },
  link: { color: colors.moss, textDecorationLine: 'underline' },
});
