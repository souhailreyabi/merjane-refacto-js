import {
	describe, it, expect, beforeEach,
	afterEach, vi
} from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { type INotificationService } from '../notifications.port.js';
import { ProductService } from './product.service.js';
import { products, type Product } from '@/db/schema.js';
import { type Database } from '@/db/type.js';

const mockProducts: Product[] = [
	{
		id: 1,
		leadTime: 15,
		available: 30,
		type: 'NORMAL',
		name: 'USB Cable',
		expiryDate: null,
		seasonStartDate: null,
		seasonEndDate: null,
	},
];
describe('ProductService Tests', () => {
	let notificationServiceMock: DeepMockProxy<INotificationService>;
	let productService: ProductService;
	const mockDatabase: Partial<Database> = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(undefined),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockResolvedValue(undefined),
		query: {
			products: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
		},
	};
	beforeEach(async () => {
		notificationServiceMock = mockDeep<INotificationService>();
		productService = new ProductService({
			notificationService: notificationServiceMock,
			db: mockDatabase as Database,
		});
		const product: Product = {
			id: 1,
			leadTime: 15,
			available: 0,
			type: 'NORMAL',
			name: 'RJ45 Cable',
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
		};

		// Mock insertion logic
		(mockDatabase.insert as vi.Mock).mockImplementation(() => ({
			values: vi.fn().mockResolvedValue(undefined),
		}));

		// Ensure that the mock database returns the inserted product when queried
		(mockDatabase.query.products.findFirst as vi.Mock).mockResolvedValue(product);

	});

	afterEach(() => {
		vi.resetAllMocks();
	});
	it('should handle delay notification correctly', async () => {

		const product: Product = {
			id: 1,
			leadTime: 15,
			available: 0,
			type: 'NORMAL',
			name: 'RJ45 Cable',
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
		};
		// GIVEN

		await mockDatabase.insert(products).values(product);

		// WHEN
		await productService.notifyDelay(product.leadTime, product);

		// THEN
		expect(product.available).toBe(0);
		expect(product.leadTime).toBe(15);
		expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(product.leadTime, product.name);
		const result = await mockDatabase.query.products.findFirst({
			where: (product, { eq }) => eq(product.id, product.id),
		});
		expect(result).toEqual(product);
	});
	it('should update a product successfully', async () => {
		const product: Product = {
			id: 1,
			leadTime: 15,
			available: 0,
			type: 'NORMAL',
			name: 'RJ45 Cable',
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
		};

		// Perform the update operation
		await productService.updateProduct(product);

		// Retrieve the mock object
		const updateMock = mockDatabase.update as vi.Mock;

		// Check if update was called
		expect(updateMock).toHaveBeenCalled();
		console.log((mockDatabase.update as vi.Mock).mock.calls);

		// Ensure the `set` method is correctly chained and called
		const setMock = (updateMock() as any).set;
		const whereMock = (updateMock() as any).where;

		// Assertions
		expect(setMock).toHaveBeenCalledWith(product);
		expect(whereMock).toHaveBeenCalledWith({ id: product.id });
	});
	it('should handle errors during update', async () => {
		const error = new Error('Database error');
		// Mock the database update to reject with an error
		(mockDatabase.update as vi.Mock).mockImplementation(() => ({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockRejectedValueOnce(error),
		}));

		const product: Product = {
			id: 1,
			leadTime: 15,
			available: 30,
			type: 'NORMAL',
			name: 'USB Cable',
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
		};

		await expect(productService.updateProduct(product)).rejects.toThrow(`Unable to update product with id ${product.id}`);
	});
});



