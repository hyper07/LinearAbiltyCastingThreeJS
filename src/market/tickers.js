/**
 * The stock game's starting list: 50 of the largest S&P 500 companies (by
 * market value, late 2026, approximately) and SPY as the benchmark. The admin
 * dashboard adds, removes and switches off any of them; this is only the seed.
 */
export const STARTER_TICKERS = [
  ['NVDA', 'NVIDIA', 'Information Technology'],
  ['MSFT', 'Microsoft', 'Information Technology'],
  ['AAPL', 'Apple', 'Information Technology'],
  ['AMZN', 'Amazon', 'Consumer Discretionary'],
  ['GOOGL', 'Alphabet (Class A)', 'Communication Services'],
  ['META', 'Meta Platforms', 'Communication Services'],
  ['AVGO', 'Broadcom', 'Information Technology'],
  ['TSLA', 'Tesla', 'Consumer Discretionary'],
  ['BRK.B', 'Berkshire Hathaway (Class B)', 'Financials'],
  ['JPM', 'JPMorgan Chase', 'Financials'],
  ['LLY', 'Eli Lilly', 'Health Care'],
  ['WMT', 'Walmart', 'Consumer Staples'],
  ['V', 'Visa', 'Financials'],
  ['ORCL', 'Oracle', 'Information Technology'],
  ['MA', 'Mastercard', 'Financials'],
  ['XOM', 'Exxon Mobil', 'Energy'],
  ['NFLX', 'Netflix', 'Communication Services'],
  ['COST', 'Costco', 'Consumer Staples'],
  ['JNJ', 'Johnson & Johnson', 'Health Care'],
  ['PLTR', 'Palantir', 'Information Technology'],
  ['HD', 'Home Depot', 'Consumer Discretionary'],
  ['ABBV', 'AbbVie', 'Health Care'],
  ['PG', 'Procter & Gamble', 'Consumer Staples'],
  ['BAC', 'Bank of America', 'Financials'],
  ['UNH', 'UnitedHealth', 'Health Care'],
  ['KO', 'Coca-Cola', 'Consumer Staples'],
  ['GE', 'GE Aerospace', 'Industrials'],
  ['CVX', 'Chevron', 'Energy'],
  ['AMD', 'Advanced Micro Devices', 'Information Technology'],
  ['CSCO', 'Cisco', 'Information Technology'],
  ['TMUS', 'T-Mobile US', 'Communication Services'],
  ['WFC', 'Wells Fargo', 'Financials'],
  ['IBM', 'IBM', 'Information Technology'],
  ['PM', 'Philip Morris International', 'Consumer Staples'],
  ['MS', 'Morgan Stanley', 'Financials'],
  ['GS', 'Goldman Sachs', 'Financials'],
  ['CRM', 'Salesforce', 'Information Technology'],
  ['ABT', 'Abbott Laboratories', 'Health Care'],
  ['LIN', 'Linde', 'Materials'],
  ['AXP', 'American Express', 'Financials'],
  ['MCD', "McDonald's", 'Consumer Discretionary'],
  ['INTU', 'Intuit', 'Information Technology'],
  ['MU', 'Micron Technology', 'Information Technology'],
  ['DIS', 'Walt Disney', 'Communication Services'],
  ['RTX', 'RTX', 'Industrials'],
  ['T', 'AT&T', 'Communication Services'],
  ['PEP', 'PepsiCo', 'Consumer Staples'],
  ['CAT', 'Caterpillar', 'Industrials'],
  ['NOW', 'ServiceNow', 'Information Technology'],
  ['VZ', 'Verizon', 'Communication Services']
].map(([symbol, name, sector]) => ({ symbol, name, sector }));

export const BENCHMARK = { symbol: 'SPY', name: 'SPDR S&P 500 ETF (the whole market)', sector: 'Index fund' };

/** Game money: everyone starts with this, in dollars. */
export const START_CASH = 1_000_000;

/** A ticker symbol as the exchanges write it (BRK.B, GOOGL). */
export const SYMBOL = /^[A-Z][A-Z0-9]{0,5}([.-][A-Z]{1,2})?$/;
