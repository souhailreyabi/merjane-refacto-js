import { eq } from 'drizzle-orm';
import { orders, type Order, type Product } from '@/db/schema.js';
import { type Database } from '@/db/type.js';

export class OrderService {
    private readonly db: Database;

    public constructor({ db }: { db: Database }) {
        this.db = db;
    }
    public async getProductsInOrder(orderId: number): Promise<Product[]> {
        return await this.db.query.orders
            .findFirst({
                where: eq(orders.id, orderId),
                with: {
                    products: {
                        columns: {},
                        with: {
                            product: true,
                        },
                    },
                },
            })!;


    }

}
