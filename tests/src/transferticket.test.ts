/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {
    TransferTicket,
    DIDStore,
    DID
} from "@elastosfoundation/did-js-sdk";
import {
    TestData,
} from "./utils/testdata";

describe('TransferTicket Tests', () => {
    let testData: TestData;
    let store: DIDStore;

    beforeEach(async () => {
        testData = await TestData.create();
        await testData.cleanup();
        store = await testData.getStore();
    });

    afterEach(async () => {});

    test('Test FooBar', async () => {
        let td = testData.getInstantData();

        let ticket = await td.getFooBarTransferTicket();
        let json = ticket.serialize();
        let parsedTicket = TransferTicket.parse(json);

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
        let parsedTicket = TransferTicket.parse(json);

        expect(parsedTicket.getSubject().equals(ticket.getSubject())).toBeTruthy();
        expect(parsedTicket.getTo().equals(ticket.getTo())).toBeTruthy();
        expect(parsedTicket.getTransactionId()).toEqual(ticket.getTransactionId());
        expect(parsedTicket.getProofs().length).toBe(ticket.getProofs().length);

        for (let i = 0; i < ticket.getProofs().length; i++)
            expect(parsedTicket.getProofs()[i].equals(ticket.getProofs()[i]));
    });

    ["2", "2.2"].forEach((version) => {
        test('testMultiSignatureTicket', async () => {
            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let tt = await cd.getTransferTicket("foobar");

            expect(tt.getSubject().equals(new DID("did:elastos:foobar"))).toBeTruthy();
            expect(tt.getTo().equals(new DID("did:elastos:igHbSCez6H3gTuVPzwNZRrdj92GCJ6hD5d"))).toBeTruthy();
            expect(tt.getProofs().length).toBe(2);

            let genuine = await tt.isGenuine();
            expect(genuine).toBeTruthy();
        });
    });

    ["2", "2.2"].forEach((version) => {
        test('testTicket', async () => {
            let cd = testData.getCompatibleData(version);
            await cd.loadAll();

            let tt = await cd.getTransferTicket("baz");

            expect(tt.getSubject().equals(new DID("did:elastos:baz"))).toBeTruthy();
            expect(tt.getTo().equals(new DID("did:elastos:igHbSCez6H3gTuVPzwNZRrdj92GCJ6hD5d"))).toBeTruthy();
            expect(tt.getProofs().length).toBe(1);

            let genuine = await tt.isGenuine();
            expect(genuine).toBeTruthy();
        });
    });
});