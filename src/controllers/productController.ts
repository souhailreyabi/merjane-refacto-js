import fastifyPlugin from 'fastify-plugin';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const productController = fastifyPlugin(async server => {
    // Add schema validator and serializer
    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);

    server.withTypeProvider<ZodTypeProvider>().post('/orders/:orderId/processOrder', {
        schema: {
            params: z.object({
                orderId: z.coerce.number(),
            }),
        },
    }, async (request, reply) => {
        const ps = server.diContainer.resolve('ps');

        const order = ps.getProductsInOrder(request.params.orderId)
        const { products: productList } = order;

        if (productList.length > 0) ps.handleProducts(productList)
        await reply.send({ orderId: order.id });
    });
});


