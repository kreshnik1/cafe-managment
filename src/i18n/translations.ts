export type Language = 'en' | 'sq' | 'mk';

// English is the canonical key set
const en = {
  // ─── Tabs ──────────────────────────────────────
  tabDashboard:    'Dashboard',
  tabOrders:       'Orders',
  tabInventory:    'Inventory',
  tabTransactions: 'Transactions',
  tabMore:         'More',

  // ─── More screen ───────────────────────────────
  moreTitle:              'More',
  moreAnalytics:          'Analytics',
  moreInventorySection:   'Inventory',
  moreTeam:               'Team',
  moreSettingsSection:    'Settings',
  settingsMenuItem:       'Settings',
  settingsMenuSub:        'Currency, language and preferences',
  statisticsMenuItem:     'Statistics',
  statisticsMenuSub:      'Revenue, expenses and profit charts',
  purchaseOrdersMenuItem: 'Purchase Orders',
  purchaseOrdersMenuSub:  'Supplier deliveries and stock purchases',
  staffMenuItem:          'Staff & Shifts',
  staffMenuSub:           'Manage employees and work shifts',
  ownerBadge:             'Owner',
  signOut:                'Sign Out',
  signOutSub:             'Sign out of your account',
  signOutTitle:           'Sign out',
  signOutConfirm:         'Are you sure you want to sign out?',
  cancel:                 'Cancel',

  // ─── Settings ──────────────────────────────────
  settingsTitle:    'Settings',
  settingsCurrency: 'Currency',
  settingsLanguage: 'Language',

  // ─── Dashboard ─────────────────────────────────
  dashboardIncome:         "Today's Income",
  dashboardExpenses:       'Expenses',
  dashboardProfit:         'Profit',
  dashboardCashBalance:    'Cash Balance',
  dashboardOrders:         'Orders',
  dashboardRecentActivity: 'Recent Activity',
  dashboardSeeAll:         'See all',
  dashboardNoActivity:     'No activity yet today',
  dashboardAddTransaction: 'Add Transaction',
  dashboardNewOrder:       'New Order',

  // ─── Transactions ──────────────────────────────
  transactionsTitle:    'Transactions',
  transactionsIncome:   'Income',
  transactionsExpenses: 'Expenses',
  transactionsNet:      'Net',
  transactionsCount:    'Transactions',

  // ─── Orders ────────────────────────────────────
  ordersTitle:    'Orders',
  ordersNewOrder: 'New Order',
  ordersPaid:     'Paid',
  ordersUnpaid:   'Unpaid',
  ordersTable:    'Table',
  ordersWalkIn:   'Walk-in',
  ordersNote:     'Note',

  // ─── Inventory ─────────────────────────────────
  inventoryTitle:         'Inventory',
  inventoryDrinks:        'Drinks',
  inventoryFood:          'Food',
  inventoryLowStock:      'Low stock',
  inventoryAll:           'All',
  inventoryHistory:       'History',
  inventoryNewOrder:      'New Order',
  inventoryRestock:       'Restock',
  inventoryNoProducts:    'No products yet.',
  inventoryNoProductsSub: 'Tap + to add your first product.',

  // ─── Statistics ────────────────────────────────
  statisticsTitle:    'Statistics',
  statisticsDaily:    'Daily',
  statisticsMonthly:  'Monthly',
  statisticsYearly:   'Yearly',
  statisticsCustom:   'Custom',
  statisticsIncome:   'Income',
  statisticsExpenses: 'Expenses',
  statisticsProfit:   'Profit',

  // ─── Shifts ────────────────────────────────────
  shiftsTitle: 'Staff & Shifts',
};

export type TranslationKey = keyof typeof en;

// ─── Albanian ──────────────────────────────────────────────────────
const sq: Record<TranslationKey, string> = {
  tabDashboard:    'Ballina',
  tabOrders:       'Porositë',
  tabInventory:    'Inventari',
  tabTransactions: 'Transaksionet',
  tabMore:         'Më shumë',

  moreTitle:              'Më shumë',
  moreAnalytics:          'Analitikë',
  moreInventorySection:   'Inventari',
  moreTeam:               'Ekipi',
  moreSettingsSection:    'Cilësimet',
  settingsMenuItem:       'Cilësimet',
  settingsMenuSub:        'Monedha, gjuha dhe preferencat',
  statisticsMenuItem:     'Statistikat',
  statisticsMenuSub:      'Grafikët e të ardhurave dhe shpenzimeve',
  purchaseOrdersMenuItem: 'Urdhrat e blerjes',
  purchaseOrdersMenuSub:  'Furnizime dhe blerje stoku',
  staffMenuItem:          'Stafi & Turnet',
  staffMenuSub:           'Menaxho punonjësit dhe turnet',
  ownerBadge:             'Pronar',
  signOut:                'Dil',
  signOutSub:             'Dil nga llogaria jote',
  signOutTitle:           'Dil',
  signOutConfirm:         'Jeni i sigurt që dëshironi të dilni?',
  cancel:                 'Anulo',

  settingsTitle:    'Cilësimet',
  settingsCurrency: 'Monedha',
  settingsLanguage: 'Gjuha',

  dashboardIncome:         'Të ardhurat e sotme',
  dashboardExpenses:       'Shpenzimet',
  dashboardProfit:         'Fitimi',
  dashboardCashBalance:    'Bilanci i gatshëm',
  dashboardOrders:         'Porositë',
  dashboardRecentActivity: 'Aktiviteti i fundit',
  dashboardSeeAll:         'Shiko të gjitha',
  dashboardNoActivity:     'Nuk ka aktivitet sot',
  dashboardAddTransaction: 'Shto transaksion',
  dashboardNewOrder:       'Porosi e re',

  transactionsTitle:    'Transaksionet',
  transactionsIncome:   'Të ardhura',
  transactionsExpenses: 'Shpenzime',
  transactionsNet:      'Neto',
  transactionsCount:    'Transaksione',

  ordersTitle:    'Porositë',
  ordersNewOrder: 'Porosi e re',
  ordersPaid:     'Paguar',
  ordersUnpaid:   'Papaguar',
  ordersTable:    'Tavolina',
  ordersWalkIn:   'Pa rezervim',
  ordersNote:     'Shënim',

  inventoryTitle:         'Inventari',
  inventoryDrinks:        'Pijet',
  inventoryFood:          'Ushqimi',
  inventoryLowStock:      'Stok i ulët',
  inventoryAll:           'Të gjitha',
  inventoryHistory:       'Historia',
  inventoryNewOrder:      'Porosi e re',
  inventoryRestock:       'Rifurnizo',
  inventoryNoProducts:    'Asnjë produkt ende.',
  inventoryNoProductsSub: 'Shtyp + për të shtuar produktin e parë.',

  statisticsTitle:    'Statistikat',
  statisticsDaily:    'Ditore',
  statisticsMonthly:  'Mujore',
  statisticsYearly:   'Vjetore',
  statisticsCustom:   'Personalizuar',
  statisticsIncome:   'Të ardhura',
  statisticsExpenses: 'Shpenzime',
  statisticsProfit:   'Fitim',

  shiftsTitle: 'Stafi & Turnet',
};

// ─── Macedonian ────────────────────────────────────────────────────
const mk: Record<TranslationKey, string> = {
  tabDashboard:    'Панел',
  tabOrders:       'Нарачки',
  tabInventory:    'Залихи',
  tabTransactions: 'Трансакции',
  tabMore:         'Повеќе',

  moreTitle:              'Повеќе',
  moreAnalytics:          'Аналитика',
  moreInventorySection:   'Залихи',
  moreTeam:               'Тим',
  moreSettingsSection:    'Поставки',
  settingsMenuItem:       'Поставки',
  settingsMenuSub:        'Валута, јазик и преференци',
  statisticsMenuItem:     'Статистика',
  statisticsMenuSub:      'Графикони на приходи и расходи',
  purchaseOrdersMenuItem: 'Нарачки за набавка',
  purchaseOrdersMenuSub:  'Испораки и набавки на залихи',
  staffMenuItem:          'Персонал и смени',
  staffMenuSub:           'Управувај со вработените и смените',
  ownerBadge:             'Сопственик',
  signOut:                'Одјави се',
  signOutSub:             'Одјави се од вашата сметка',
  signOutTitle:           'Одјави се',
  signOutConfirm:         'Дали сте сигурни дека сакате да се одјавите?',
  cancel:                 'Откажи',

  settingsTitle:    'Поставки',
  settingsCurrency: 'Валута',
  settingsLanguage: 'Јазик',

  dashboardIncome:         'Приходи денес',
  dashboardExpenses:       'Расходи',
  dashboardProfit:         'Добивка',
  dashboardCashBalance:    'Готовински салдо',
  dashboardOrders:         'Нарачки',
  dashboardRecentActivity: 'Последни активности',
  dashboardSeeAll:         'Види сè',
  dashboardNoActivity:     'Нема активности денес',
  dashboardAddTransaction: 'Додај трансакција',
  dashboardNewOrder:       'Нова нарачка',

  transactionsTitle:    'Трансакции',
  transactionsIncome:   'Приходи',
  transactionsExpenses: 'Расходи',
  transactionsNet:      'Нето',
  transactionsCount:    'Трансакции',

  ordersTitle:    'Нарачки',
  ordersNewOrder: 'Нова нарачка',
  ordersPaid:     'Платено',
  ordersUnpaid:   'Неплатено',
  ordersTable:    'Маса',
  ordersWalkIn:   'Без резервација',
  ordersNote:     'Забелешка',

  inventoryTitle:         'Залихи',
  inventoryDrinks:        'Пијалоци',
  inventoryFood:          'Храна',
  inventoryLowStock:      'Мали залихи',
  inventoryAll:           'Сите',
  inventoryHistory:       'Историја',
  inventoryNewOrder:      'Нова нарачка',
  inventoryRestock:       'Дополни',
  inventoryNoProducts:    'Сè уште нема производи.',
  inventoryNoProductsSub: 'Допри + за да додадете производ.',

  statisticsTitle:    'Статистика',
  statisticsDaily:    'Дневна',
  statisticsMonthly:  'Месечна',
  statisticsYearly:   'Годишна',
  statisticsCustom:   'Прилагодено',
  statisticsIncome:   'Приходи',
  statisticsExpenses: 'Расходи',
  statisticsProfit:   'Добивка',

  shiftsTitle: 'Персонал и смени',
};

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { en, sq, mk };
