import rss from '@astrojs/rss';

export async function GET(context) {
    // TODO: Fix RSS feed to work with Astro v5 and import.meta.glob
    // The RSS feed needs to be updated to properly handle the new glob import syntax
    return rss({
        title: 'Laksh Chakraborty',
        description: 'A blog about all the development that I\'m doing',
        site: context.site,
        items: [],
    });
}
