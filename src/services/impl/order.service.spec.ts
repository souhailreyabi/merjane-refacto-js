import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type Database } from "@/db/type.js";
import { type Product } from "@/db/schema.js";
import { OrderService } from "./order.service.js";

// Define a mock database
const mockDatabase: Partial<Database> = {
    query: {
        orders: {
            findFirst: vi.fn(),
        },
    },
};
let orderService: OrderService;

describe("OrderService", () => {
    beforeEach(() => {
        orderService = new OrderService({
            db: mockDatabase as unknown as Database,
        });
    });
    afterEach(() => {
        // Clear all mock calls and reset the state of mocks
        vi.resetAllMocks();
    });
    it("should return products for a given orderId", async () => {
        const d = 24 * 60 * 60 * 1000;

        const Products: Product[] = [
            {
                leadTime: 15,
                available: 30,
                type: "NORMAL",
                name: "USB Cable",
                id: 0,
                expiryDate: null,
                seasonStartDate: null,
                seasonEndDate: null,
            },
            {
                leadTime: 10,
                available: 0,
                type: "NORMAL",
                name: "USB Dongle",
                id: 1,
                expiryDate: null,
                seasonStartDate: null,
                seasonEndDate: null,
            },
            {
                leadTime: 15,
                available: 30,
                type: "EXPIRABLE",
                name: "Butter",
                expiryDate: new Date(Date.now() + 26 * d),
                id: 2,
                seasonStartDate: null,
                seasonEndDate: null,
            },
        ];

        mockDatabase.query.orders.findFirst!.mockResolvedValueOnce({
            products: Products.map((product) => ({ product })),
        });

        const orderId = 5;

        const products = await orderService.getOrderWithProducts(orderId);

        expect(products).toEqual(products);
    });

    it("should handle errors thrown by the database", async () => {
        const orderId = 7;
        const error = new Error(`Order with ID ${orderId} not found`);
        mockDatabase.query.orders.findFirst!.mockRejectedValueOnce(error);
        await expect(orderService.getOrderWithProducts(orderId)).rejects.toThrow(
            error
        );
    });
});
