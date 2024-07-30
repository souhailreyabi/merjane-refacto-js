import {
	describe, it, expect, beforeEach,
	afterEach, vi
} from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { type INotificationService } from '../notifications.port.js';
import { ProductService } from './product.service.js';
import { products, type Product } from '@/db/schema.js';
import { type Database } from '@/db/type.js';
import { eq } from 'drizzle-orm';

const product: Product = {
	id: 1,
	leadTime: 15,
	available: 0,
	type: 'NORMAL',
	name: 'USB Cable',
	expiryDate: null,
	seasonStartDate: null,
	seasonEndDate: null,
};
const seasonalProduct: Product = {
	type: 'SEASONAL',
	available: 1,
	seasonStartDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
	seasonEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
	leadTime: 2,
	id: 2,
	name: 'SeasonalProduct'
};
const expirableProduct: Product = {
	type: 'EXPIRABLE',
	available: 1,
	expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
	leadTime: 2,
	id: 3,
	name: 'ExpirableProduct'
};
const listOfProducts: Product[] = [product, seasonalProduct, expirableProduct]

describe('ProductService Tests', () => {
	let notificationServiceMock: DeepMockProxy<INotificationService>;
	let productService: ProductService;
	const handleNormalProductMock = vi.fn();
	const handleSeasonalProductMock = vi.fn();
	const handleExpiredProductMock = vi.fn();
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
		productService.handleNormalProduct = handleNormalProductMock;
		productService.handleExpiredProduct = handleExpiredProductMock;
		productService.handleSeasonalProduct = handleSeasonalProductMock;

		(mockDatabase.insert as vi.Mock).mockImplementation(() => ({
			values: vi.fn().mockResolvedValue(undefined),
		}));

		(mockDatabase.query.products.findFirst as vi.Mock).mockResolvedValue(product);

	});

	afterEach(() => {
		vi.resetAllMocks();
	});
	it('should handle delay notification correctly', async () => {

		await mockDatabase.insert(products).values(product);

		await productService.notifyDelay(product.leadTime, product);

		expect(product.available).toBe(0);
		expect(product.leadTime).toBe(15);
		expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(product.leadTime, product.name);
		const result = await mockDatabase.query.products.findFirst({
			where: (product: Product, { eq }) => eq(product.id, product.id),
		});
		expect(result).toEqual(product);
	});
	it('should update a product successfully', async () => {

		(mockDatabase.update as vi.Mock).mockReturnValue({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
		});
		await productService.updateProduct(product);

		expect(mockDatabase.update).toHaveBeenCalledWith(products);
		expect(mockDatabase.update().set).toHaveBeenCalledWith(product);
		expect(mockDatabase.update().set().where).toHaveBeenCalledWith(eq(products.id, product.id));
	});
	it('should handle errors during update', async () => {
		const error = new Error('Database error');
		(mockDatabase.update as vi.Mock).mockImplementation(() => ({
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockRejectedValueOnce(error),
		}));

		await expect(productService.updateProduct(product)).rejects.toThrow(`Unable to update product with id ${product.id}`);
	});
	it.each([
		[product, handleNormalProductMock],
		[seasonalProduct, handleSeasonalProductMock],
		[expirableProduct, handleExpiredProductMock],
	])('should call the correct handler for %s type', async (p: Product, expectedHandler: vi.Mock) => {
		await productService.handleProducts(listOfProducts);
		expect(expectedHandler).toHaveBeenCalledWith(p);
	});

});



