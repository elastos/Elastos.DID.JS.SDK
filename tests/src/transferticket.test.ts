import {
	TransferTicket,
	DIDStore,
} from "@elastosfoundation/did-js-sdk";
import {
	TestData,
} from "./utils/testdata";

describe('TransferTicket Tests', () => {
	let testData: TestData;
	let store: DIDStore;

	beforeEach(async () => {
		testData = new TestData();
		await testData.cleanup();
		store = await testData.getStore();
	});

	afterEach(async () => {});

	test('Test FooBar', async () => {
        let td = testData.getInstantData();

        let ticket = await td.getFooBarTransferTicket();
        let json = ticket.serialize();
        let parsedTicket = await TransferTicket.parse(json, TransferTicket);

        expect(parsedTicket.getSubject().equals(ticket.getSubject())).toBeTruthy();
        expect(parsedTicket.getTo().equals(ticket.getTo())).toBeTruthy();
        expect(parsedTicket.getTransactionId()).toEqual(ticket.getTransactionId());
        expect(parsedTicket.getProofs().length).toEqual(ticket.getProofs().length);

        for (let i = 0; i < ticket.getProofs().length; i++)
            expect(parsedTicket.getProofs()[i].equals(ticket.getProofs()[i]));
	});

	test('Test Baz', async () => {
        let td = testData.getInstantData();

        let ticket = await td.getBazTransferTicket();
        let json = ticket.serialize();
        let parsedTicket = await TransferTicket.parse(json, TransferTicket);

        expect(parsedTicket.getSubject().equals(ticket.getSubject())).toBeTruthy();
        expect(parsedTicket.getTo().equals(ticket.getTo())).toBeTruthy();
        expect(parsedTicket.getTransactionId()).toEqual(ticket.getTransactionId());
        expect(parsedTicket.getProofs().length).toBe(ticket.getProofs().length);

        for (let i = 0; i < ticket.getProofs().length; i++)
            expect(parsedTicket.getProofs()[i].equals(ticket.getProofs()[i]));
	});
});