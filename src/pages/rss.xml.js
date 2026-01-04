import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const blog = await getCollection('blog');
    const publishedPosts = blog.filter(post => !post.data.draft);

    return rss({
        title: 'Laksh Chakraborty',
        description: 'A blog about all the development that I\'m doing',
        site: context.site,
        items: publishedPosts.map((post) => ({
            title: post.data.title,
            description: post.data.subtitle || post.data.description || '',
            link: `/blog/${post.slug}/`,
            pubDate: new Date(post.data.pubDate || post.data.publishDate),
        })),
    });
}
