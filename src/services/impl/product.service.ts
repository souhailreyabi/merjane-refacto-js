import { type Cradle } from '@fastify/awilix';
import { eq } from 'drizzle-orm';
import { type INotificationService } from '../notifications.port.js';
import { products, type Product } from '@/db/schema.js';
import { type Database } from '@/db/type.js';

export class ProductService {
	private readonly notificationService: INotificationService;
	private readonly db: Database;

	public constructor({ notificationService, db }: Pick<Cradle, 'notificationService' | 'db'>) {
		this.notificationService = notificationService;
		this.db = db;
	}

	public async updateProduct(p: Product): Promise<void> {
		try {
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} catch (error) {
			console.error(`Failed to update product with id ${p.id}:`, error);
			throw new Error(`Unable to update product with id ${p.id}`);
		}
	}

	public async handleNormalProduct(p: Product): Promise<void> {
		if (p.available > 0) {
			p.available -= 1;
			await this.updateProduct(p);
		} else if (p.leadTime && p.leadTime > 0) {
			await this.notifyDelay(p.leadTime, p);
		}
	}

	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.db.update(products).set(p).where(eq(products.id, p.id));
		this.notificationService.sendDelayNotification(leadTime, p.name);
	}

	public async handleSeasonalProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		if (p.seasonStartDate && p.seasonEndDate &&
			currentDate > p.seasonStartDate && currentDate < p.seasonEndDate && p.available > 0) {
			p.available -= 1;
			await this.updateProduct(p);
		} else {
			await this.handleOffSeasonProduct(p);
		}
	}

	public async handleOffSeasonProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		const d = 1000 * 60 * 60 * 24;
		if (new Date(currentDate.getTime() + (p.leadTime * d)) > p.seasonEndDate!) {
			this.notificationService.sendOutOfStockNotification(p.name);
			p.available = 0;
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} else if (p.seasonStartDate! > currentDate) {
			this.notificationService.sendOutOfStockNotification(p.name);
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} else {
			await this.notifyDelay(p.leadTime, p);
		}
	}
	public async handleExpiredProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		if (p.available > 0 && p.expiryDate! > currentDate) {
			p.available -= 1;
		} else {
			this.notificationService.sendExpirationNotification(p.name, p.expiryDate!);
			p.available = 0;

		}
		await this.updateProduct(p);
	}
	public async handleProducts(productList: Product[]): Promise<void> {
		for (const p of productList) {
			switch (p.type) {
				case 'NORMAL':
					await this.handleNormalProduct(p);
					break;

				case 'SEASONAL':
					await this.handleSeasonalProduct(p);
					break;

				case 'EXPIRABLE':
					await this.handleExpiredProduct(p);
					break;
			}
		}
	}

}
