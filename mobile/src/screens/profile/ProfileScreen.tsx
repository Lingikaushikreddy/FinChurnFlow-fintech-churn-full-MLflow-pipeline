/**
 * Profile Screen - User profile and settings
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import {
  Text,
  Avatar,
  Surface,
  Switch,
  Divider,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { AppDispatch, RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { colors, spacing, shadows } from '../../theme';
import { LANGUAGES } from '../../i18n';
import { BottomSheet } from '../../components/ui';
import { formatPhoneNumber } from '../../utils/formatters';

const KYC_STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  verified: { label: 'Verified', color: colors.success, icon: 'check-decagram' },
  pending: { label: 'Pending', color: colors.warning, icon: 'clock-outline' },
  rejected: { label: 'Rejected', color: colors.error, icon: 'close-circle-outline' },
  not_started: { label: 'Not Started', color: colors.textSecondary, icon: 'alert-circle-outline' },
};

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '42';

const ProfileScreen: React.FC = () => {
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { profile } = useSelector((state: RootState) => state.merchant);

  const currentLanguage = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const kycInfo = KYC_STATUS_MAP[profile?.kycStatus || 'not_started'] || KYC_STATUS_MAP.not_started;

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      'Are you sure you want to logout?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
  };

  const handleChangeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageSheet(false);
    setSnackMessage(`Language changed to ${LANGUAGES.find((l) => l.code === langCode)?.name || langCode}`);
    setShowSnack(true);
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkModeEnabled(value);
    // In a full implementation, this would dispatch a theme change action
    setSnackMessage(value ? 'Dark mode enabled' : 'Dark mode disabled');
    setShowSnack(true);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    setSnackMessage(value ? 'Notifications enabled' : 'Notifications disabled');
    setShowSnack(true);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to reach us?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@nano.app'),
        },
        {
          text: 'Phone',
          onPress: () => Linking.openURL('tel:+911234567890'),
        },
      ]
    );
  };

  const menuItems = [
    {
      section: 'Account',
      items: [
        {
          icon: 'phone',
          label: 'Phone',
          value: profile?.phone
            ? formatPhoneNumber(profile.phone, { countryCode: true })
            : 'Not set',
          onPress: () => {},
        },
        {
          icon: 'at',
          label: `UPI ID`,
          value: profile?.upiId || 'Not set',
          onPress: () => {},
        },
        {
          icon: 'shield-check',
          label: 'KYC Status',
          value: kycInfo.label,
          valueColor: kycInfo.color,
          valueIcon: kycInfo.icon,
          onPress: () => {},
        },
        {
          icon: 'account-edit',
          label: t('profile.editProfile'),
          onPress: () => {},
        },
        {
          icon: 'lock',
          label: t('profile.setPin'),
          onPress: () => {},
        },
      ],
    },
    {
      section: 'Preferences',
      items: [
        {
          icon: 'translate',
          label: t('profile.language'),
          value: currentLanguage.nativeName,
          onPress: () => setShowLanguageSheet(true),
        },
        {
          icon: 'bell-outline',
          label: 'Notifications',
          toggle: true,
          value: notificationsEnabled,
          onToggle: handleNotificationsToggle,
        },
        {
          icon: 'theme-light-dark',
          label: 'Dark Mode',
          toggle: true,
          value: darkModeEnabled,
          onToggle: handleDarkModeToggle,
        },
      ],
    },
    {
      section: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: t('profile.help'),
          onPress: () => {},
        },
        {
          icon: 'headset',
          label: 'Contact Support',
          onPress: handleContactSupport,
        },
        {
          icon: 'information-outline',
          label: t('profile.about'),
          onPress: () => {},
        },
        {
          icon: 'file-document-outline',
          label: 'Terms & Privacy',
          onPress: () => {},
        },
      ],
    },
  ];

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <Surface style={styles.profileCard}>
          <Avatar.Text
            size={80}
            label={getInitials(profile?.name || 'U')}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
            <Text style={styles.businessName}>{profile?.businessName}</Text>
            <View style={styles.upiContainer}>
              <Icon name="at" size={14} color={colors.primary} />
              <Text style={styles.upiId}>{profile?.upiId || 'Not set'}</Text>
            </View>
            <View style={styles.kycBadge}>
              <Chip
                mode="flat"
                compact
                icon={kycInfo.icon}
                style={[styles.kycChip, { backgroundColor: kycInfo.color + '20' }]}
                textStyle={{ color: kycInfo.color, fontSize: 11 }}
              >
                KYC: {kycInfo.label}
              </Chip>
            </View>
          </View>
        </Surface>

        {/* Phone Number Banner */}
        {profile?.phone && (
          <Surface style={styles.phoneBanner}>
            <Icon name="cellphone" size={20} color={colors.primary} />
            <View style={styles.phoneInfo}>
              <Text style={styles.phoneLabel}>Registered Phone</Text>
              <Text style={styles.phoneValue}>
                {formatPhoneNumber(profile.phone, { countryCode: true })}
              </Text>
            </View>
            <Chip
              mode="flat"
              compact
              style={styles.verifiedChip}
              textStyle={{ color: colors.success, fontSize: 11 }}
            >
              Verified
            </Chip>
          </Surface>
        )}

        {/* Menu Sections */}
        {menuItems.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <Surface style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.label}>
                  {itemIndex > 0 && <Divider />}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress}
                    disabled={item.toggle}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuLeft}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: colors.primary + '15' },
                        ]}
                      >
                        <Icon
                          name={item.icon}
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>

                    {item.toggle ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        color={colors.primary}
                      />
                    ) : (
                      <View style={styles.menuRight}>
                        {item.valueIcon ? (
                          <View style={styles.valueWithIcon}>
                            <Icon
                              name={item.valueIcon}
                              size={16}
                              color={item.valueColor || colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.menuValue,
                                item.valueColor ? { color: item.valueColor } : {},
                              ]}
                            >
                              {item.value as string}
                            </Text>
                          </View>
                        ) : item.value ? (
                          <Text
                            style={[
                              styles.menuValue,
                              item.valueColor ? { color: item.valueColor } : {},
                            ]}
                          >
                            {item.value as string}
                          </Text>
                        ) : null}
                        <Icon
                          name="chevron-right"
                          size={24}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </Surface>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.version}>Nano v{APP_VERSION} ({BUILD_NUMBER})</Text>
          <Text style={styles.versionSub}>Made with care in India</Text>
        </View>
      </ScrollView>

      {/* Language Selection Sheet */}
      <BottomSheet
        visible={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
      >
        <Text style={styles.sheetTitle}>{t('profile.language')}</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              i18n.language === lang.code && styles.languageItemSelected,
            ]}
            onPress={() => handleChangeLanguage(lang.code)}
          >
            <View>
              <Text style={styles.languageName}>{lang.name}</Text>
              <Text style={styles.languageNative}>{lang.nativeName}</Text>
            </View>
            {i18n.language === lang.code && (
              <Icon name="check" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </BottomSheet>

      <Snackbar
        visible={showSnack}
        onDismiss={() => setShowSnack(false)}
        duration={2000}
      >
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    ...shadows.md,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  businessName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4,
  },
  upiId: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  kycBadge: {
    marginTop: spacing.sm,
  },
  kycChip: {
    alignSelf: 'flex-start',
  },
  phoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  phoneInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  phoneLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  phoneValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  verifiedChip: {
    backgroundColor: colors.success + '15',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textDisabled,
  },
  versionSub: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  languageItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  languageName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  languageNative: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default ProfileScreen;
