export type AuthStackParamList = {
  Welcome: undefined;
  ConnectWallet: undefined;
  RoleSelect: undefined;
};

export type UserTabParamList = {
  Explore: undefined;
  MyPasses: undefined;
  Scan: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type UserStackParamList = {
  UserTabs: undefined;
  EventDetails: { eventKey: string };
  BuyTicket: { eventKey: string };
  TicketQR: { ticketKey: string };
  ScanToPay: undefined;
  Settings: undefined;
  About: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  ManageEvents: undefined;
  Scanner: undefined;
  Profile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  CreateEvent: undefined;
  RegisterMerchant: { eventKey: string };
  CheckInScanner: { eventKey: string };
  Settings: undefined;
  About: undefined;
};

export type MerchantTabParamList = {
  Dashboard: undefined;
  GenerateQR: undefined;
  Transactions: undefined;
  Profile: undefined;
};

export type MerchantStackParamList = {
  MerchantTabs: undefined;
  Settings: undefined;
  About: undefined;
};

export type SuperAdminTabParamList = {
  System: undefined;
  Admins: undefined;
  Events: undefined;
  Profile: undefined;
};

export type SuperAdminStackParamList = {
  SuperAdminTabs: undefined;
  CreateAdmin: undefined;
  InitializeBadgeCollection: undefined;
  CreateEvent: undefined;
  RegisterMerchant: { eventKey: string };
  CheckInScanner: { eventKey: string };
  Settings: undefined;
  About: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  User: undefined;
  Admin: undefined;
  Merchant: undefined;
  SuperAdmin: undefined;
};

export type UserRole = "user" | "admin" | "merchant" | "super_admin";
