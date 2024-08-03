import { eq } from 'drizzle-orm';
import { orders, type Product } from '@/db/schema.js';
import { type Database } from '@/db/type.js';

export class OrderService {
    private readonly db: Database;

    public constructor({ db }: { db: Database }) {
        this.db = db;
    }
    public async getOrderWithProducts(orderId: number): Promise<Product[]> {
        const order = await this.db.query.orders
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
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        const productList = order.products.map((orderProducts: any) => orderProducts.product);
        return productList;

    }

}
