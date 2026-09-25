import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BLESSINGS, EQUIPMENT, type BlessingId, type EquipmentId } from '@/avatar/catalog';
import { equipmentArtwork } from '@/avatar/assets';
import { IllustratedAvatar, PixelAvatar } from '@/components/AvatarPreview';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { useTutorial } from '@/components/TutorialProvider';
import { Button, DreamyBackground, Sparkle } from '@/components/ui';
import { getAvatarPreferences, getJourneyStats, saveAvatarPreferences } from '@/db/repo';
import { colors, fonts, glow, gradients, radius } from '@/theme';

const blessingBackgrounds: Record<BlessingId, number> = {
  amaterasu: require('../../../assets/blessing-amaterasu.png'),
  susanoo: require('../../../assets/blessing-susanoo.png'),
  okuninushi: require('../../../assets/blessing-okuninushi.png'),
  inari: require('../../../assets/blessing-inari.png'),
};

export default function AvatarScreen() {
  const db = useSQLiteContext();
  const { replayTutorial } = useTutorial();
  const [visits, setVisits] = useState<number | null>(null);
  const [blessingId, setBlessingId] = useState<BlessingId>('amaterasu');
  const [focusedBlessingId, setFocusedBlessingId] = useState<BlessingId>('amaterasu');
  const [equipment, setEquipment] = useState<EquipmentId[]>(['magatama', 'omamori', 'shide', 'haori']);
  const [direction, setDirection] = useState<0 | 1 | 2 | 3>(0);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getAvatarPreferences(db), getJourneyStats(db)]).then(([preferences, stats]) => {
      if (!active) return;
      if (BLESSINGS.some((item) => item.id === preferences.blessing)) {
        setBlessingId(preferences.blessing as BlessingId);
        setFocusedBlessingId(preferences.blessing as BlessingId);
      }
      setEquipment(preferences.equipment.filter((id): id is EquipmentId => EQUIPMENT.some((item) => item.id === id)));
      setVisits(stats.visitCount);
    });
    return () => { active = false; };
  }, [db]));

  const blessing = useMemo(() => BLESSINGS.find((item) => item.id === blessingId) ?? BLESSINGS[0], [blessingId]);
  const focusedBlessing = useMemo(() => BLESSINGS.find((item) => item.id === focusedBlessingId) ?? BLESSINGS[0], [focusedBlessingId]);
  const focusedUnlocked = (visits ?? 0) >= focusedBlessing.threshold;
  const focusedProgress = focusedBlessing.threshold === 0 ? 1 : Math.min((visits ?? 0) / focusedBlessing.threshold, 1);

  function toggleEquipment(id: EquipmentId, threshold: number) {
    if ((visits ?? 0) < threshold) return;
    setEquipment((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setSaving(true);
    try {
      await saveAvatarPreferences(db, { blessing: blessingId, equipment });
      Alert.alert('この姿に着替えました', 'HOMEのミニキャラにも反映されます。');
    } catch (error) {
      Alert.alert('保存できませんでした', String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      {visits === null && <KamiLoadingScreen variant="loading" message="あなたのご縁を集めています…" />}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.kicker}>YOUR PILGRIMAGE STYLE</Text><View style={styles.titleRow}><Text style={styles.title}>MY AVATAR</Text><Sparkle size={18} /></View><Text style={styles.subtitle}>ご縁をまとって、めぐりへ。</Text></View>
          <View style={styles.visitPill}><Ionicons name="footsteps" size={16} color={colors.accent} /><Text style={styles.visitText}>{visits ?? 0} めぐり</Text></View>
        </View>

        <View style={styles.previewSection}>
          <IllustratedAvatar blessing={blessing} equipment={equipment} style={styles.illustration} />
          <View style={styles.pixelPanel}>
            <Text style={styles.panelEyebrow}>MINI CHARACTER</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`ミニキャラは${['正面', '右向き', '後ろ向き', '左向き'][direction]}です。タップして向きを変える`}
              onPress={() => setDirection((current) => ((current + 1) % 4) as 0 | 1 | 2 | 3)}
              style={({ pressed }) => [styles.pixelTapTarget, pressed && styles.pixelPressed]}
            >
              <PixelAvatar blessing={blessing} equipment={equipment} direction={direction} size={124} />
              <View style={styles.rotateHint}><Ionicons name="sync" size={11} color="#FFFFFF" /><Text style={styles.rotateHintText}>TAP</Text></View>
            </Pressable>
            <Text style={styles.blessingName}>{blessing.name}</Text>
            <Text style={styles.blessingMeta}>{blessing.deity}</Text>
            <View style={styles.directionRow}>
              {(['正面', '右', '後ろ', '左'] as const).map((label, index) => (
                <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: direction === index }} onPress={() => setDirection(index as 0 | 1 | 2 | 3)} style={[styles.direction, direction === index && styles.directionActive]}>
                  <Text style={[styles.directionText, direction === index && styles.directionTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <SectionHeader icon="sunny-outline" title="加護スタイル" caption="参拝を重ねて、新しい加護と出会えます" />
        <View style={[styles.featuredBlessing, { borderColor: focusedBlessing.color }]}>
          <ImageBackground source={blessingBackgrounds[focusedBlessing.id]} resizeMode="cover" style={StyleSheet.absoluteFill} imageStyle={styles.featuredArtwork}>
            <LinearGradient colors={['rgba(8,7,28,.02)', 'rgba(8,7,28,.16)', 'rgba(8,7,28,.95)']} locations={[0, .38, 1]} style={StyleSheet.absoluteFill} />
            {!focusedUnlocked && <View style={styles.sealedOverlay} />}
          </ImageBackground>
          <View style={styles.featuredTopbar}>
            <View style={styles.sacredLabel}><Ionicons name={focusedUnlocked ? focusedBlessing.icon : 'lock-closed'} size={14} color="#FFFFFF" /><Text style={styles.sacredLabelText}>DIVINE BLESSING</Text></View>
            <Text style={styles.featuredSymbol}>{focusedBlessing.symbol}</Text>
          </View>
          <View style={styles.featuredCopy}>
            <Text style={styles.invocation}>{focusedUnlocked ? focusedBlessing.invocation : 'まだ見ぬ神さま'}</Text>
            <Text style={styles.featuredName}>{focusedUnlocked ? focusedBlessing.name : '封印された加護'}</Text>
            <View style={styles.featuredDeityRow}><View style={[styles.featuredRule, { backgroundColor: focusedBlessing.color }]} /><Text style={styles.featuredDeity}>{focusedBlessing.deity}</Text></View>
            <Text style={styles.featuredStory}>{focusedUnlocked ? `「${focusedBlessing.story}」` : `あと${focusedBlessing.threshold - (visits ?? 0)}回の参拝で、このご縁が結ばれます。`}</Text>
            <View style={styles.effectPanel}>
              <View style={[styles.effectIcon, { backgroundColor: focusedBlessing.color }]}><Ionicons name="sparkles" size={14} color="#FFFFFF" /></View>
              <View style={styles.effectCopy}><Text style={styles.effectLabel}>AVATAR EFFECT</Text><Text style={styles.effectText}>{focusedUnlocked ? focusedBlessing.effect : '解放すると演出が現れます'}</Text></View>
            </View>
            {!focusedUnlocked && <View style={styles.featuredProgress}><View style={[styles.featuredProgressFill, { width: `${focusedProgress * 100}%`, backgroundColor: focusedBlessing.color }]} /></View>}
            <Pressable accessibilityRole="button" disabled={!focusedUnlocked || blessingId === focusedBlessing.id} onPress={() => setBlessingId(focusedBlessing.id)} style={({ pressed }) => [styles.receiveButton, { backgroundColor: focusedUnlocked ? focusedBlessing.deep : 'rgba(255,255,255,.2)' }, pressed && styles.blessingPressed]}>
              <Ionicons name={blessingId === focusedBlessing.id ? 'checkmark-circle' : focusedUnlocked ? 'sparkles' : 'lock-closed'} size={17} color="#FFFFFF" />
              <Text style={styles.receiveButtonText}>{blessingId === focusedBlessing.id ? 'この加護をまとっています' : focusedUnlocked ? 'この加護をまとう' : `${visits ?? 0} / ${focusedBlessing.threshold} めぐり`}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.ofudaHeading}><Text style={styles.ofudaHeadingText}>授かった御神札</Text><Text style={styles.ofudaHint}>札を選んで詳しく見る</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blessings}>
          {BLESSINGS.map((item) => {
            const unlocked = (visits ?? 0) >= item.threshold;
            const selected = blessingId === item.id;
            const progress = item.threshold === 0 ? 1 : Math.min((visits ?? 0) / item.threshold, 1);
            return (
              <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: focusedBlessingId === item.id }} onPress={() => setFocusedBlessingId(item.id)} style={({ pressed }) => [styles.blessingCard, focusedBlessingId === item.id && { borderColor: item.color, transform: [{ translateY: -3 }] }, !unlocked && styles.blessingLocked, pressed && styles.blessingPressed]}>
                <ImageBackground source={blessingBackgrounds[item.id]} resizeMode="cover" style={StyleSheet.absoluteFill} imageStyle={styles.blessingArtwork}>
                  <LinearGradient colors={['rgba(9,8,28,.02)', 'rgba(9,8,28,.18)', 'rgba(9,8,28,.88)']} locations={[0, .42, 1]} style={StyleSheet.absoluteFill} />
                  {!unlocked && <View style={styles.sealedOverlay} />}
                </ImageBackground>
                <Text style={styles.watermark}>{item.symbol}</Text>
                <View style={styles.cardCrestRow}>
                  <View style={[styles.crestOuter, { borderColor: unlocked ? item.color : colors.lineStrong }]}>
                    <View style={[styles.crestInner, { backgroundColor: unlocked ? item.color : '#D8D1DC' }]}><Ionicons name={unlocked ? item.icon : 'lock-closed'} size={24} color="#FFFFFF" /></View>
                    <View style={[styles.crestSpark, { backgroundColor: unlocked ? item.deep : colors.muted }]} />
                  </View>
                  <View style={styles.cardStatus}>
                    <Text style={styles.cardNumber}>KAGO {String(BLESSINGS.indexOf(item) + 1).padStart(2, '0')}</Text>
                    {selected && <View style={[styles.equippedPill, { backgroundColor: item.deep }]}><Ionicons name="checkmark" size={10} color="#FFFFFF" /><Text style={styles.equippedText}>装着中</Text></View>}
                  </View>
                </View>
                <View style={styles.blessingCopy}>
                  <Text style={styles.blessingCardName} numberOfLines={1}>{unlocked ? item.name : 'まだ見ぬ加護'}</Text>
                  <View style={styles.deityRow}><View style={[styles.deityRule, { backgroundColor: unlocked ? item.color : '#FFFFFF' }]} /><Text style={styles.unlockText}>{unlocked ? item.deity : `参拝まで あと${item.threshold - (visits ?? 0)}回`}</Text></View>
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: unlocked ? item.color : colors.lineStrong }]} /></View>
                <View style={styles.cardFooter}><Text style={styles.cardFooterText}>{unlocked ? 'TAP TO RECEIVE' : `${visits ?? 0} / ${item.threshold} VISITS`}</Text><Ionicons name={unlocked ? 'sparkles' : 'lock-closed-outline'} size={11} color="#FFFFFF" /></View>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionHeader icon="bag-handle-outline" title="装備アイテム" caption="選んだ装備はミニキャラにも反映" />
        <View style={styles.equipmentGrid}>
          {EQUIPMENT.map((item) => {
            const unlocked = (visits ?? 0) >= item.threshold;
            const selected = equipment.includes(item.id);
            return (
              <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: !unlocked }} onPress={() => toggleEquipment(item.id, item.threshold)} style={[styles.equipmentCard, selected && styles.equipmentSelected, !unlocked && styles.locked]}>
                <View style={styles.itemIcon}>{unlocked ? <Image source={equipmentArtwork[item.id]} resizeMode="contain" style={styles.itemArtwork} /> : <Ionicons name="lock-closed" size={21} color={colors.inkSoft} />}</View>
                <Text style={styles.itemName}>{unlocked ? item.name : `あと${item.threshold - (visits ?? 0)}回`}</Text>
                {selected && <View style={styles.check}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View>}
              </Pressable>
            );
          })}
        </View>

        <Button label="この姿にする" onPress={save} loading={saving} icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />} />
        <Pressable accessibilityRole="button" onPress={replayTutorial} style={styles.tutorialReplay}><Ionicons name="help-circle-outline" size={17} color={colors.violet} /><Text style={styles.tutorialReplayText}>チュートリアルをもう一度見る</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title, caption }: { icon: 'sunny-outline' | 'bag-handle-outline'; title: string; caption: string }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionTitleRow}><LinearGradient colors={gradients.primary} style={styles.sectionIcon}><Ionicons name={icon} size={17} color="#FFFFFF" /></LinearGradient><Text style={styles.sectionTitle}>{title}</Text></View><Text style={styles.sectionCaption}>{caption}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, scroll: { flex: 1 }, content: { flexGrow: 1, padding: 16, paddingBottom: 56, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, kicker: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.7, color: colors.violet },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, title: { fontFamily: fonts.displayHeavy, fontSize: 27, color: colors.ink }, subtitle: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  visitPill: { paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', gap: 5, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1, borderColor: colors.line }, visitText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  previewSection: { flexDirection: 'row', gap: 10 }, illustration: { flex: 1, height: 348, minHeight: 348 }, pixelPanel: { width: 148, padding: 10, alignItems: 'center', borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft },
  panelEyebrow: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1, color: colors.violet }, blessingName: { marginTop: 7, fontFamily: fonts.bold, fontSize: 11, color: colors.ink, textAlign: 'center' }, blessingMeta: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  pixelTapTarget: { position: 'relative', marginTop: 2, borderRadius: 24 }, pixelPressed: { transform: [{ scale: .96 }], opacity: .88 }, rotateHint: { position: 'absolute', right: 5, top: 5, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(50,35,88,.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,.6)' }, rotateHintText: { fontFamily: fonts.bold, fontSize: 7, letterSpacing: .7, color: '#FFFFFF' },
  directionRow: { marginTop: 9, flexDirection: 'row', gap: 3 }, direction: { paddingHorizontal: 5, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.track }, directionActive: { backgroundColor: colors.accent }, directionText: { fontFamily: fonts.bold, fontSize: 8, color: colors.muted }, directionTextActive: { color: '#FFFFFF' },
  sectionHeader: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sectionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink }, sectionCaption: { flex: 1, marginLeft: 10, fontFamily: fonts.regular, fontSize: 9, textAlign: 'right', color: colors.muted },
  featuredBlessing: { height: 430, overflow: 'hidden', borderRadius: 30, borderWidth: 2, backgroundColor: '#17132E', boxShadow: glow.strong, padding: 18 }, featuredArtwork: { borderRadius: 28 }, featuredTopbar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, sacredLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(14,10,35,.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,.45)' }, sacredLabelText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF' }, featuredSymbol: { fontFamily: fonts.displayHeavy, fontSize: 42, lineHeight: 45, color: 'rgba(255,255,255,.86)', textShadowColor: 'rgba(0,0,0,.45)', textShadowRadius: 8 }, featuredCopy: { marginTop: 'auto' }, invocation: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,.76)' }, featuredName: { marginTop: 2, fontFamily: fonts.displayHeavy, fontSize: 27, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.72)', textShadowRadius: 8 }, featuredDeityRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 7 }, featuredRule: { width: 28, height: 3, borderRadius: 2 }, featuredDeity: { fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' }, featuredStory: { marginTop: 11, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: 'rgba(255,255,255,.9)' }, effectPanel: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)' }, effectIcon: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, effectCopy: { flex: 1 }, effectLabel: { fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1.3, color: 'rgba(255,255,255,.62)' }, effectText: { marginTop: 2, fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' }, featuredProgress: { height: 5, overflow: 'hidden', marginTop: 10, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.25)' }, featuredProgressFill: { height: '100%', borderRadius: 3 }, receiveButton: { marginTop: 12, minHeight: 45, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,.46)' }, receiveButtonText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' }, ofudaHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, ofudaHeadingText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink }, ofudaHint: { fontFamily: fonts.regular, fontSize: 9, color: colors.muted },
  blessings: { gap: 9, paddingVertical: 7, paddingRight: 4 }, blessingCard: { width: 132, height: 174, padding: 9, overflow: 'hidden', borderRadius: 20, backgroundColor: '#201A38', borderWidth: 2, borderColor: 'rgba(255,255,255,.9)', boxShadow: glow.soft }, blessingLocked: { opacity: .74 }, blessingPressed: { transform: [{ scale: .98 }] }, blessingArtwork: { borderRadius: 18 }, sealedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(73,64,89,.43)' },
  watermark: { position: 'absolute', right: -7, bottom: -22, fontFamily: fonts.displayHeavy, fontSize: 104, color: '#FFFFFF', opacity: .08 },
  cardCrestRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, crestOuter: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.72)' }, crestInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,.8)', transform: [{ scale: .85 }] }, crestSpark: { position: 'absolute', right: 0, top: 3, width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: '#FFFFFF' },
  cardStatus: { alignItems: 'flex-end', gap: 7 }, cardNumber: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.5)', textShadowRadius: 4 }, equippedPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10 }, equippedText: { fontFamily: fonts.bold, fontSize: 8, color: '#FFFFFF' },
  blessingCopy: { marginTop: 'auto', gap: 3 }, blessingCardName: { fontFamily: fonts.display, fontSize: 11, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.7)', textShadowRadius: 5 }, mutedText: { color: colors.muted }, deityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, deityRule: { width: 11, height: 2, borderRadius: 1 }, unlockText: { fontFamily: fonts.bold, fontSize: 7, color: 'rgba(255,255,255,.88)', textShadowColor: 'rgba(0,0,0,.8)', textShadowRadius: 4 },
  progressTrack: { height: 3, marginTop: 6, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,.28)' }, progressFill: { height: '100%', borderRadius: 2 }, cardFooter: { marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardFooterText: { fontFamily: fonts.bold, fontSize: 6, letterSpacing: .6, color: 'rgba(255,255,255,.82)' },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, equipmentCard: { width: '23%', minHeight: 82, padding: 7, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1.5, borderColor: colors.line, position: 'relative' }, equipmentSelected: { borderColor: colors.accent, backgroundColor: colors.accentTint }, locked: { opacity: .45 },
  itemIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, itemArtwork: { width: 45, height: 45 }, itemName: { fontFamily: fonts.bold, fontSize: 9, color: colors.ink, textAlign: 'center' }, check: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  tutorialReplay: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, tutorialReplayText: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet },
});
