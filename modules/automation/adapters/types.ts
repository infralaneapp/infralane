export interface ActionAdapter {
  name: string;
  execute(params: AdapterParams): Promise<AdapterResult>;
}

export type AdapterParams = {
  ticketId: string;
  ticketRef: string;
  actionValue: string;
  config: Record<string, unknown>;
  ruleId: string;
  ruleName: string;
};

export type AdapterResult = {
  success: boolean;
  detail?: string;
  externalRef?: string;
};
