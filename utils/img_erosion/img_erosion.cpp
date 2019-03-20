#include "stdafx.h"

#include "opencv2/imgproc/imgproc.hpp"
#include "opencv2/highgui/highgui.hpp"
#include "opencv/highgui.h"
#include <stdlib.h>
#include <stdio.h>
#include <iostream>

using namespace cv;
using namespace std;

int main(int argc, char** argv)
{
	if (argc != 3)
	{
		cout << " Usage: img_erosion.exe <input> <output>" << endl;
		return -1;
	}

	try {
		Mat image;

		image = imread(argv[1], IMREAD_COLOR); // Read the file
		if (image.empty()) // Check for invalid input
		{
			cout << "Could not open or find the image" << std::endl;
			return 2;
		}

		if (!image.data)
		{
			cout << "Could not read the image" << std::endl;
			return 3;
		}

		int erosion_size = 1;

		Mat element = getStructuringElement(MORPH_ELLIPSE,
			Size(2 * erosion_size + 1, 2 * erosion_size + 1),
			Point(erosion_size, erosion_size));

		Mat erosion_dst;

		dilate(image, erosion_dst, element);

		imwrite(argv[2], erosion_dst);

		return 0;
	}
	catch (const std::exception& e) {
		cout << e.what() << std::endl;
		return 1;
	}
}
