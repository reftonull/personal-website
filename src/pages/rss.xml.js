import rss, {
    pagesGlobToRssItems
} from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';

export function GET(context) {
    const blog = import.meta.glob('./blog/*.md', { eager: true })
    const posts = Object.values(blog)
        .filter(post => post.frontmatter.draft !== true);
    return rss({
        title: 'Laksh Chakraborty',
        description: 'A blog about all the development that I\'m doing',
        site: context.site,
        items: posts.map((post) => ({
            link: post.url,
            content: post.compiledContent(),
            ...post.frontmatter,
        })),
    });
}
