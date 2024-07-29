import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrderService } from './order.service';
import { type Database } from '@/db/type.js';
import { orders, type Product } from '@/db/schema.js';

// Define a mock database
const mockDatabase: Partial<Database> = {
    query: {
        orders: {
            findFirst: vi.fn(),
        },
    },
};

describe('OrderService', () => {
    let orderService: OrderService;

    beforeEach(() => {
        orderService = new OrderService({ db: mockDatabase as Database });
    });
    afterEach(() => {
        // Clear all mock calls and reset the state of mocks
        vi.resetAllMocks();
    });
    it('should return products for a given orderId', async () => {
        const d = 24 * 60 * 60 * 1000;

        const Products: Product[] = [
            {
                leadTime: 15, available: 30, type: 'NORMAL', name: 'USB Cable',
            },
            {
                leadTime: 10, available: 0, type: 'NORMAL', name: 'USB Dongle',
            },
            {
                leadTime: 15, available: 30, type: 'EXPIRABLE', name: 'Butter', expiryDate: new Date(Date.now() + (26 * d)),
            }
        ];

        mockDatabase.query.orders.findFirst!.mockResolvedValueOnce({
            products: Products.map(product => ({ product })),
        });


        const orderId = 5;

        const products = await orderService.getProductsInOrder(orderId);

        expect(products).toEqual(products);
    });

    it('should handle errors thrown by the database', async () => {
        const error = new Error('Database error');
        mockDatabase.query.orders.findFirst!.mockRejectedValueOnce(error);

        const orderId = 7;

        await expect(orderService.getProductsInOrder(orderId)).rejects.toThrow(error);
    });
});