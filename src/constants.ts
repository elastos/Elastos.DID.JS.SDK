export enum ChangeChain {
	EXTERNAL = 0,
	INTERNAL = 1
}

export enum CoinType {
	ELA = 0,
	IDCHAIN = 1
}

export enum SignType {
	ELA_STANDARD = 'ELA_STANDARD',
	ELA_MULTISIG = 'ELA_MULTISIG',
	ELA_CROSSCHAIN = 'ELA_CROSSCHAIN',
	ELA_IDCHAIN = 'ELA_IDCHAIN',
	ELA_DESTROY = 'ELA_DESTROY'
}

export class SignTypeMap  {
	public static readonly ELA_STANDARD = { type: 0xac, address: 0x21 };
	public static readonly ELA_MULTISIG = { type: 0xae, address: 0x12 };
	public static readonly ELA_CROSSCHAIN = { type: 0xaf, address: 0x48 };
	public static readonly ELA_IDCHAIN = { type: 0xad, address: 0x67 };
	public static readonly ELA_DESTROY = { type: 0xaa,  address: 0x0 };
}

