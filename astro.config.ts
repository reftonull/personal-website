import { defineConfig } from "astro/config";

// https://astro.build/config
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import mdx from "@astrojs/mdx";
import rehypeRewrite from "rehype-rewrite";
import remarkGfm from "remark-gfm";

import type { Root, Element } from "hast";

// https://astro.build/config
// import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
// import netlify from "@astrojs/netlify/functions";

// https://astro.build/config
export default defineConfig({
    site: 'https://lakshchakraborty.com',
    markdown: {
        drafts: true,
    },
    integrations: [
        tailwind(),
        mdx({
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
                [
                    rehypeRewrite,
                    {
                        selector: "h1",
                        rewrite: (node: Element, index: number, parent: Element) => {
                            const headingNum = parent.children
                                .filter((value) => {
                                    return (
                                        value.type === "element" &&
                                        (value.tagName === "h1" ||
                                            value.properties!.className === "md-heading")
                                    );
                                })
                                .findIndex((value) => {
                                    return value === node;
                                });
                            if (node.type === "element") {
                                const copy = JSON.parse(JSON.stringify(node));
                                node.tagName = "div";
                                node.properties!.className = "md-heading";
                                const newDiv: Element = {
                                    type: "element",
                                    tagName: "div",
                                    children: [
                                        {
                                            type: "element",
                                            tagName: "div",
                                            children: [
                                                {
                                                    type: "text",
                                                    value: String(headingNum + 1),
                                                },
                                            ],
                                        },
                                    ],
                                };
                                node.children = [newDiv, copy];
                            }
                        },
                    },
                ],
            ],
        }),
    ],
    // output: "server",
    // adapter: vercel()
});
