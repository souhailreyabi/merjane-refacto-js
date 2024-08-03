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
        const orderService = server.diContainer.resolve('orderService');
        const productService = server.diContainer.resolve('productService');

        const productList = await orderService.getOrderWithProducts(request.params.orderId)


        if (productList.length > 0) productService.handleProducts(productList)
        await reply.send({ orderId: request.params.orderId });
    });
});


