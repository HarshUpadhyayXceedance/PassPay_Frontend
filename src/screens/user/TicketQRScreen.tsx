import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "../../components/ui/AppHeader";
import { QRPreview } from "../../components/qr/QRPreview";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useTickets } from "../../hooks/useTickets";
import { useWalletStore } from "../../store/walletStore";
import { encodeQRPayload } from "../../utils/qrPayload";
import { formatDate, shortenAddress } from "../../utils/formatters";
import { UserStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<UserStackParamList, "TicketQR">;
type Route = RouteProp<UserStackParamList, "TicketQR">;

export function TicketQRScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { tickets } = useTickets();
  const publicKey = useWalletStore((s) => s.publicKey);

  const ticket = tickets.find((t) => t.publicKey === route.params.ticketKey);

  if (!ticket) {
    return (
      <View style={styles.container}>
        <AppHeader title="Ticket QR" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Ticket not found</Text>
        </View>
      </View>
    );
  }

  const qrData = encodeQRPayload({
    type: "ticket",
    mint: ticket.mint,
    owner: publicKey ?? "",
    event: ticket.eventKey,
  });

  return (
    <View style={styles.container}>
      <AppHeader
        title="Ticket QR"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <QRPreview
          data={qrData}
          title={ticket.eventName}
          subtitle={`Seat #${ticket.seatNumber}`}
          size={240}
        />

        <AppCard style={styles.infoCard}>
          <InfoRow label="Event" value={ticket.eventName} />
          <InfoRow label="Venue" value={ticket.eventVenue} />
          <InfoRow label="Date" value={formatDate(ticket.eventDate)} />
          <InfoRow label="Seat" value={`#${ticket.seatNumber}`} />
          <InfoRow label="Mint" value={shortenAddress(ticket.mint, 6)} />
          <InfoRow
            label="Status"
            value={ticket.isCheckedIn ? "Checked In" : "Valid"}
          />
        </AppCard>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
  },
  infoCard: {
    marginTop: spacing.sm,
  },
});
