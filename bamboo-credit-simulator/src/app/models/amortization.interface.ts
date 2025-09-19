export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining_balance: number;
}